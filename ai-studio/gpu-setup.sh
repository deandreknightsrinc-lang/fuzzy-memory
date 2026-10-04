#!/bin/bash
# Knight Lyfe AI Studio - GPU setup for the Proxmox server.
#
# Run it on the Proxmox HOST (not inside a container), after the NVIDIA card is
# installed in the PCIe slot:
#     bash <(curl -fsSL https://raw.githubusercontent.com/deandreknightsrinc-lang/fuzzy-memory/main/ai-studio/gpu-setup.sh)
#
# What it does:
#   1. Installs the NVIDIA driver on the host (DKMS, so it rebuilds itself for new kernels)
#   2. Starts the card at every boot and makes its device files
#   3. Shares the card into the kl-oracle container (CT 112) - other containers can share it too
#   4. Installs the same driver version inside the container (without the kernel part)
#   5. Switches the AI Studio to the GPU: Ollama, PyTorch (stems, lyrics, Kokoro voices)
#      and, with KK_IMAGES=1, FLUX scene painting for kl-bible
#
# Options (put them before "bash"):
#     KL_CT=112          container to share the card with (several: KL_CT="112 113")
#     NV_VERSION=580.95.05  pin a driver version (default: NVIDIA's latest production driver)
#     KK_IMAGES=1        also install FLUX scene painting in the container
#
# Made for the Dell OptiPlex 9010 SFF with an RTX A2000 12 GB, but works with any
# NVIDIA card from the last ~8 years. The built-in Intel graphics keep running the
# Proxmox console. Safe to run again: it skips what is already done.

set -uo pipefail

CTS="${KL_CT:-112}"
WORK=/root/kl-gpu
TOOLS=/opt/kk-ai

say() { printf '\n\033[1;36m== %s\033[0m\n' "$*"; }
ok() { printf '  \033[32mok\033[0m %s\n' "$*"; }
warn() { printf '  \033[33m!\033[0m %s\n' "$*"; }
die() { printf '\n\033[31m%s\033[0m\n' "$*"; exit 1; }

[[ $EUID -eq 0 ]] || die "Run this as root on the Proxmox host (pve > Shell)."
command -v pveversion >/dev/null || die "This is for the Proxmox host. (Inside kl-oracle, run setup.sh instead.)"

# ---- 1. Is the card there? ------------------------------------------------------------
say "Looking for the NVIDIA card"
card=$(lspci -nn | grep -iE 'vga|3d controller' | grep -i '10de:' | head -1)
if [[ -z $card ]]; then
    lspci | grep -iE 'vga|3d' | sed 's/^/  /'
    die "No NVIDIA card found. Power off, fit the card in the PCIe x16 slot, and run this again."
fi
echo "  $card"
slot=${card%% *}
ok "found at $slot"

# A card bound to vfio-pci (for passthrough to a VM) can't be used by containers.
if grep -rqsE 'vfio-pci.*ids=.*10de' /etc/modprobe.d/ 2>/dev/null; then
    warn "An /etc/modprobe.d file hands NVIDIA cards to vfio-pci (VM passthrough):"
    grep -rsE 'vfio-pci.*ids=.*10de' /etc/modprobe.d/ | sed 's/^/    /'
    die "Remove that line (or the 10de:... id) and run 'update-initramfs -u -k all', reboot, then run this again."
fi
if grep -lqs "hostpci.*${slot%.*}" /etc/pve/qemu-server/*.conf 2>/dev/null; then
    warn "A VM is set to take this card (hostpci in $(grep -ls "hostpci.*${slot%.*}" /etc/pve/qemu-server/*.conf | xargs -n1 basename | tr '\n' ' '))."
    warn "Remove it from that VM's Hardware tab, or the VM and the containers will fight over the card."
fi

# ---- 2. Host driver ---------------------------------------------------------------------
say "Preparing the host"
export DEBIAN_FRONTEND=noninteractive
if ! apt-get update -qq; then
    die "apt-get update failed. In Proxmox, open pve > Updates > Repositories: disable the 'enterprise' repos and add 'No-Subscription', then run this again."
fi
kver=$(uname -r)
apt-get install -y -qq build-essential dkms pkg-config wget >/dev/null || die "could not install build tools"
apt-get install -y -qq "proxmox-headers-$kver" >/dev/null 2>&1 \
    || apt-get install -y -qq "pve-headers-$kver" >/dev/null 2>&1 \
    || die "could not install the kernel headers for $kver"
# Headers for future kernels too, so DKMS rebuilds the driver after Proxmox updates.
apt-get install -y -qq proxmox-default-headers >/dev/null 2>&1 || apt-get install -y -qq pve-headers >/dev/null 2>&1 || true
ok "headers for $kver"

# nouveau (the open-source driver) must stay out of the way.
if [[ ! -f /etc/modprobe.d/blacklist-nouveau.conf ]]; then
    mkdir -p /etc/modprobe.d
    printf 'blacklist nouveau\noptions nouveau modeset=0\n' > /etc/modprobe.d/blacklist-nouveau.conf
    update-initramfs -u -k all >/dev/null 2>&1
fi
if lsmod | grep -q '^nouveau'; then
    warn "The open-source nouveau driver is loaded. It is now switched off for the next boot."
    die "Reboot the server (pve > Reboot, or 'reboot'), then run this script again."
fi
ok "nouveau off"

mkdir -p "$WORK"
if [[ -z ${NV_VERSION:-} ]]; then
    NV_VERSION=$(wget -qO- https://download.nvidia.com/XFree86/Linux-x86_64/latest.txt | awk '{print $1}')
    [[ $NV_VERSION =~ ^[0-9]+\.[0-9]+ ]] || die "Could not look up the latest NVIDIA driver. Set one: NV_VERSION=580.95.05 bash gpu-setup.sh"
fi
RUN="$WORK/NVIDIA-Linux-x86_64-$NV_VERSION.run"
have=$(nvidia-smi --query-gpu=driver_version --format=csv,noheader 2>/dev/null | head -1)
if [[ $have == "$NV_VERSION" ]]; then
    ok "driver $NV_VERSION already installed"
else
    say "Installing the NVIDIA driver $NV_VERSION on the host"
    [[ -s $RUN ]] || wget -q --show-progress -O "$RUN" "https://download.nvidia.com/XFree86/Linux-x86_64/$NV_VERSION/NVIDIA-Linux-x86_64-$NV_VERSION.run" \
        || { rm -f "$RUN"; die "Download failed. Check the version number at https://www.nvidia.com/en-us/drivers/unix/"; }
    chmod +x "$RUN"
    # No X server on Proxmox: driver, CUDA libraries, nvidia-smi and nvidia-modprobe only.
    "$RUN" --silent --dkms --no-questions --no-x-check --no-nouveau-check --disable-nouveau --no-opengl-files \
        --log-file-name="$WORK/install-host.log" \
        || die "The driver install failed. The log is $WORK/install-host.log (check for 'unsupported kernel': then pin an older or newer NV_VERSION)."
    ok "driver $NV_VERSION"
fi
echo "$NV_VERSION" > "$WORK/version"

# ---- 3. Start the card at boot and make its device files -----------------------------------
say "Starting the card at every boot"
cat > /etc/modules-load.d/kl-nvidia.conf <<'EOF'
nvidia
nvidia_uvm
EOF
cat > /etc/systemd/system/kl-gpu.service <<'EOF'
[Unit]
Description=Knight Lyfe GPU: load the NVIDIA card and make its device files for the containers
After=systemd-modules-load.service
Before=pve-guests.service

[Service]
Type=oneshot
RemainAfterExit=yes
ExecStart=/usr/bin/nvidia-modprobe -c 0 -u
ExecStart=-/usr/bin/nvidia-modprobe -m
ExecStart=-/usr/bin/nvidia-smi -pm 1
ExecStart=/bin/sh -c 'chmod 0666 /dev/nvidia* /dev/nvidia-caps/* 2>/dev/null || true'

[Install]
WantedBy=multi-user.target
EOF
systemctl daemon-reload
modprobe nvidia 2>/dev/null; modprobe nvidia_uvm 2>/dev/null
systemctl enable --now kl-gpu.service >/dev/null 2>&1 || systemctl restart kl-gpu.service
nvidia-smi -L >/dev/null 2>&1 || die "nvidia-smi can't see the card. Reboot and run this again; if it still fails, send the output of 'nvidia-smi' and 'dmesg | grep -i nvrm'."
nvidia-smi --query-gpu=name,memory.total,power.limit --format=csv,noheader | sed 's/^/  /'
ok "card running"

devs=()
for d in /dev/nvidia0 /dev/nvidiactl /dev/nvidia-uvm /dev/nvidia-uvm-tools /dev/nvidia-modeset /dev/nvidia-caps/nvidia-cap1 /dev/nvidia-caps/nvidia-cap2; do
    [[ -e $d ]] && devs+=("$d")
done

# ---- 4. Share it with the container(s) ---------------------------------------------------
for ct in $CTS; do
    conf=/etc/pve/lxc/$ct.conf
    say "Sharing the card with container $ct"
    [[ -f $conf ]] || { warn "container $ct does not exist; skipped"; continue; }
    changed=0
    for d in "${devs[@]}"; do
        grep -qE "^dev[0-9]+: $d(,|$)" "$conf" && continue
        n=0
        while grep -qE "^dev$n:" "$conf"; do n=$((n + 1)); done
        pct set "$ct" "--dev$n" "$d,mode=0666" >/dev/null || die "pct set $ct --dev$n $d failed"
        changed=1
    done
    if (( changed )); then
        ok "devices added: ${devs[*]}"
        if pct status "$ct" | grep -q running; then
            echo "  restarting container $ct so it sees the card (it is offline for a few seconds)..."
            pct reboot "$ct" >/dev/null 2>&1 || { pct stop "$ct" >/dev/null 2>&1; pct start "$ct" >/dev/null; }
        fi
    else
        ok "already shared"
    fi
    pct status "$ct" | grep -q running || pct start "$ct" >/dev/null || die "could not start container $ct"
    for _ in $(seq 1 30); do pct exec "$ct" -- true >/dev/null 2>&1 && break; sleep 1; done

    # ---- 5. Same driver inside, without the kernel part ----------------------------------
    inside=$(pct exec "$ct" -- nvidia-smi --query-gpu=driver_version --format=csv,noheader 2>/dev/null | head -1)
    if [[ $inside == "$NV_VERSION" ]]; then
        ok "container $ct already has driver $NV_VERSION"
    else
        echo "  installing driver $NV_VERSION (user part) in container $ct..."
        pct exec "$ct" -- bash -c 'apt-get update -qq && DEBIAN_FRONTEND=noninteractive apt-get install -y -qq kmod pciutils >/dev/null' || warn "apt-get in container $ct failed"
        pct push "$ct" "$RUN" "/root/$(basename "$RUN")" || die "could not copy the driver into container $ct"
        pct exec "$ct" -- sh "/root/$(basename "$RUN")" --silent --no-kernel-module --no-questions --no-x-check --no-nouveau-check --no-opengl-files \
            || die "The driver install inside container $ct failed (log: /var/log/nvidia-installer.log in the container)."
        pct exec "$ct" -- rm -f "/root/$(basename "$RUN")"
    fi
    if pct exec "$ct" -- nvidia-smi -L >/dev/null 2>&1; then
        ok "container $ct sees: $(pct exec "$ct" -- nvidia-smi -L | head -1)"
    else
        die "Container $ct can't see the card. Check its config: cat $conf"
    fi

    # ---- 6. Point the AI Studio at the GPU -----------------------------------------------
    if pct exec "$ct" -- test -x "$TOOLS/bin/pip"; then
        say "Switching the AI Studio in container $ct to the GPU"
        echo "  PyTorch with CUDA (stems, lyrics, Kokoro voices; about 3 GB)..."
        pct exec "$ct" -- "$TOOLS/bin/pip" install -q "torch==2.8.*" "torchaudio==2.8.*" --index-url https://download.pytorch.org/whl/cu128 >/dev/null \
            && ok "PyTorch CUDA" || warn "PyTorch CUDA install failed (the tools keep running on the CPU)"
        if [[ ${KK_IMAGES:-0} == 1 ]]; then
            pct exec "$ct" -- "$TOOLS/bin/pip" install -q diffusers transformers accelerate sentencepiece protobuf >/dev/null \
                && ok "FLUX scene painting for kl-bible (the model downloads on first use, about 24 GB)" || warn "image tools failed to install"
        fi
        gpu_torch=$(pct exec "$ct" -- "$TOOLS/bin/python" -c 'import torch; print(torch.cuda.get_device_name(0) if torch.cuda.is_available() else "")' 2>/dev/null)
        [[ -n $gpu_torch ]] && ok "PyTorch sees $gpu_torch" || warn "PyTorch doesn't see the GPU yet (try again after a container restart)"
    else
        warn "The AI Studio isn't installed in container $ct yet. Run setup.sh inside it; it picks the GPU up by itself."
    fi
    if pct exec "$ct" -- systemctl is-enabled ollama >/dev/null 2>&1; then
        pct exec "$ct" -- systemctl restart ollama
        sleep 3
        if pct exec "$ct" -- journalctl -u ollama --since '-1 min' --no-pager 2>/dev/null | grep -qiE 'library=cuda|compute.*cuda|CUDA0'; then
            ok "Ollama is using the GPU"
        else
            warn "Ollama restarted; check it with: pct exec $ct -- ollama ps   (after asking it something, PROCESSOR should say GPU)"
        fi
    fi
done

say "GPU ready"
cat <<EOF
  Card:      $(nvidia-smi --query-gpu=name,memory.total --format=csv,noheader)
  Driver:    $NV_VERSION (host, and containers: $CTS)

  Check it any time:
     nvidia-smi                        on the host: the card, its memory and what is using it
     pct exec ${CTS%% *} -- nvidia-smi             inside kl-oracle
     pct exec ${CTS%% *} -- ollama ps              PROCESSOR says GPU while a model is loaded

  After a Proxmox kernel update the driver rebuilds itself (DKMS). If nvidia-smi
  ever stops working after an update, run this script again.
  To update the driver later, run this again with NV_VERSION=<new version>.
EOF
