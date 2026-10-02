#!/bin/bash
# Knight Lyfe AI Studio - sets up the AI production helpers on a Debian/Ubuntu
# machine (made for the kl-oracle container on Proxmox).
#
# Run it as root inside the machine:
#     bash <(curl -fsSL https://raw.githubusercontent.com/deandreknightsrinc-lang/fuzzy-memory/main/ai-studio/setup.sh)
#
# What you get:
#   - Ollama with local AI models, plus three studio agents:
#       kk-mix (mix/mastering engineer), kk-sound (sound designer), kk-producer
#   - Open WebUI: a ChatGPT-style page for the agents at http://<ip>:8080
#   - Studio tools: kk-stems (split a song into vocals/drums/bass/other),
#     kk-master (master a track to match a reference), kk-lyrics (transcribe)
#   - A "studio" network folder for the Mac with drop-in folders that run the
#     tools automatically (inbox -> outbox)
#
# Safe to run again: it skips what is already installed.

set -uo pipefail

STUDIO=/srv/kk-studio
TOOLS=/opt/kk-ai
WEBUI=/opt/open-webui
MODELS="${KK_MODELS:-llama3.2:3b qwen2.5:7b}"   # override: KK_MODELS="..." bash setup.sh
CREDS=/root/kk-studio-credentials.txt

say() { printf '\n\033[1;36m== %s\033[0m\n' "$*"; }
ok() { printf '  \033[32mok\033[0m %s\n' "$*"; }
warn() { printf '  \033[33m!\033[0m %s\n' "$*"; }
die() { printf '\n\033[31m%s\033[0m\n' "$*"; exit 1; }

[[ $EUID -eq 0 ]] || die "Run this as root (in Proxmox: pct enter 112)."
command -v apt-get >/dev/null || die "This script is for Debian or Ubuntu."

# ---- Room to work -------------------------------------------------------------
say "Checking disk space"
free_gb=$(df -BG --output=avail / | tail -1 | tr -dc '0-9')
echo "  Free space: ${free_gb} GB"
if (( free_gb < 30 )); then
    warn "The AI models and tools need about 25 GB. Make the disk bigger first:"
    warn "on the Proxmox host run:  pct resize 112 rootfs +60G   then run this again."
    die "Not enough space (${free_gb} GB free)."
fi

# ---- System packages ----------------------------------------------------------
say "Installing system packages"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq curl ca-certificates python3 python3-venv python3-pip ffmpeg git \
    libsndfile1 inotify-tools samba zstd >/dev/null || die "apt-get failed"
apt-get install -y -qq samba-vfs-modules >/dev/null 2>&1 || true # Mac-friendly sharing on some releases
ok "packages"

# ---- Ollama + models ------------------------------------------------------------
say "Installing Ollama (local AI models)"
if ! command -v ollama >/dev/null; then
    curl -fsSL https://ollama.com/install.sh | sh || die "Ollama install failed"
fi
# Let the Mac and Open WebUI reach it on the local network.
mkdir -p /etc/systemd/system/ollama.service.d
cat > /etc/systemd/system/ollama.service.d/kk.conf <<'EOF'
[Service]
Environment="OLLAMA_HOST=0.0.0.0:11434"
Environment="OLLAMA_KEEP_ALIVE=30m"
EOF
systemctl daemon-reload
systemctl enable --now ollama >/dev/null 2>&1
systemctl restart ollama
for i in $(seq 1 30); do curl -fs http://127.0.0.1:11434/api/tags >/dev/null && break; sleep 1; done
ok "ollama running"

for m in $MODELS; do
    echo "  downloading model $m (this can take a while)..."
    ollama pull "$m" >/dev/null || warn "could not download $m"
done
BASE_MODEL=$(echo "$MODELS" | awk '{print $NF}')

say "Creating the studio agents"
make_agent() {
    local name="$1" prompt="$2" file
    file=$(mktemp)
    printf 'FROM %s\nPARAMETER temperature 0.6\nSYSTEM """%s"""\n' "$BASE_MODEL" "$prompt" > "$file"
    ollama create "$name" -f "$file" >/dev/null && ok "$name" || warn "could not create $name"
    rm -f "$file"
}
make_agent kk-mix "You are the mix and mastering engineer for Knight Lyfe Inc, a gospel, hip-hop and R&B production company that works in Logic Pro on a Mac. Give practical, step-by-step advice using Logic Pro's stock plug-ins first (Channel EQ, Compressor, ChromaVerb, Space Designer, Adaptive Limiter, Multipressor, Tape Delay, Mastering Assistant) and name exact settings: frequencies, ratios, attack/release, dB. Target streaming loudness around -14 LUFS integrated and -1 dBTP unless asked otherwise. Ask for the genre, tempo and what the listener should feel when it matters. Keep answers short and in order of what to do first."
make_agent kk-sound "You are the sound designer for Knight Lyfe Inc. You build patches in Logic Pro's Alchemy, Retro Synth, ES2, Sculpture, Sampler and Drum Machine Designer, and design gospel organ, keys, 808s, pads and drums. Describe sounds as exact recipes: oscillators, filters, envelopes, modulation, effects chain and settings, so they can be rebuilt by hand. Offer two or three variations when useful and name each patch."
make_agent kk-producer "You are the creative producer for Knight Lyfe Inc, working with a father and his sons who are learning piano and drums. Help with song ideas, chord progressions (use Nashville numbers and chord names), gospel and hip-hop drum grooves at a given BPM, arrangement maps (intro, verse, hook, bridge, vamp) and practice plans. Be encouraging and concrete, and keep music theory plain."

# ---- Studio tools (Demucs, Matchering, Whisper) ---------------------------------
say "Installing the studio tools (stems, mastering, lyrics)"
if [[ ! -x $TOOLS/bin/python ]]; then
    python3 -m venv "$TOOLS" || die "could not create $TOOLS"
fi
"$TOOLS/bin/pip" install -q --upgrade pip wheel >/dev/null
# torchaudio 2.9+ moved file saving to torchcodec, which Demucs does not use yet.
"$TOOLS/bin/pip" install -q "torch==2.8.*" "torchaudio==2.8.*" --index-url https://download.pytorch.org/whl/cpu >/dev/null \
    || die "PyTorch install failed"
"$TOOLS/bin/pip" install -q demucs matchering openai-whisper soundfile >/dev/null \
    || die "studio tools install failed"
ok "demucs, matchering, whisper"

cat > /usr/local/bin/kk-stems <<EOF
#!/bin/bash
# kk-stems SONG [OUTDIR]  - split a song into vocals, drums, bass and other (WAV)
set -e
[[ -f "\${1:-}" ]] || { echo "usage: kk-stems song.mp3 [outdir]"; exit 1; }
out="\${2:-$STUDIO/outbox/stems}"
mkdir -p "\$out"
$TOOLS/bin/python -m demucs -n htdemucs -o "\$out" "\$1"
echo "Stems are in \$out/htdemucs/\$(basename "\${1%.*}")"
EOF

cat > /usr/local/bin/kk-master <<EOF
#!/bin/bash
# kk-master TRACK [REFERENCE] [OUT]  - master TRACK to sound like REFERENCE
# (a finished song you like). Without REFERENCE, the newest file in
# $STUDIO/references is used.
set -e
[[ -f "\${1:-}" ]] || { echo "usage: kk-master mix.wav [reference.wav] [out.wav]"; exit 1; }
ref="\${2:-\$(ls -t $STUDIO/references/* 2>/dev/null | head -n 1)}"
[[ -f "\$ref" ]] || { echo "Put a reference song in $STUDIO/references first."; exit 1; }
out="\${3:-$STUDIO/outbox/master/\$(basename "\${1%.*}") (master).wav}"
mkdir -p "\$(dirname "\$out")"
$TOOLS/bin/python - "\$1" "\$ref" "\$out" <<'PY'
import sys, matchering as mg
target, reference, out = sys.argv[1:4]
mg.process(target=target, reference=reference, results=[mg.pcm24(out)])
print("Mastered:", out)
PY
EOF

cat > /usr/local/bin/kk-lyrics <<EOF
#!/bin/bash
# kk-lyrics SONG [OUTDIR]  - write the lyrics of a song to a text file
set -e
[[ -f "\${1:-}" ]] || { echo "usage: kk-lyrics song.mp3 [outdir]"; exit 1; }
out="\${2:-$STUDIO/outbox/lyrics}"
mkdir -p "\$out"
$TOOLS/bin/whisper "\$1" --model small --output_format txt --output_dir "\$out" --fp16 False
EOF
chmod 755 /usr/local/bin/kk-stems /usr/local/bin/kk-master /usr/local/bin/kk-lyrics
ok "kk-stems, kk-master, kk-lyrics"

# ---- Drop folders: files dropped in inbox/* are processed automatically -----------
say "Setting up the studio folders and automation"
mkdir -p "$STUDIO"/{inbox/{stems,master,lyrics},outbox/{stems,master,lyrics},references}
cat > /usr/local/bin/kk-watch <<EOF
#!/bin/bash
# Watches the inbox folders and runs the matching tool on every new file.
inotifywait -m -e close_write -e moved_to --format '%w%f' \\
    "$STUDIO/inbox/stems" "$STUDIO/inbox/master" "$STUDIO/inbox/lyrics" |
while read -r f; do
    case "\$f" in */.*|*.part|*.crdownload) continue ;; esac
    sleep 2
    case "\$f" in
        */inbox/stems/*) kk-stems "\$f" ;;
        */inbox/master/*) kk-master "\$f" ;;
        */inbox/lyrics/*) kk-lyrics "\$f" ;;
    esac && mkdir -p "\$(dirname "\$f")/done" && mv "\$f" "\$(dirname "\$f")/done/"
    chown -R studio:studio "$STUDIO" # so the Mac can move and delete the results
done
EOF
chmod 755 /usr/local/bin/kk-watch
cat > /etc/systemd/system/kk-watch.service <<'EOF'
[Unit]
Description=Knight Lyfe studio drop folders
After=network.target

[Service]
ExecStart=/usr/local/bin/kk-watch
Restart=always
Nice=10

[Install]
WantedBy=multi-user.target
EOF

# Network folder for the Mac (Finder > Go > Connect to Server).
id studio >/dev/null 2>&1 || useradd -M -s /usr/sbin/nologin studio
chown -R studio:studio "$STUDIO"
if [[ ! -f $CREDS ]] || ! grep -q '^studio share password:' "$CREDS"; then
    SMBPASS=$(tr -dc 'A-Za-z0-9' </dev/urandom | head -c 16)
    printf '%s\n%s\n' "$SMBPASS" "$SMBPASS" | smbpasswd -s -a studio >/dev/null
    echo "studio share password: $SMBPASS" >> "$CREDS"
    chmod 600 "$CREDS"
fi
if ! grep -q '^\[studio\]' /etc/samba/smb.conf; then
    cat >> /etc/samba/smb.conf <<EOF

[studio]
   path = $STUDIO
   valid users = studio
   force user = studio
   read only = no
   vfs objects = fruit streams_xattr
   fruit:metadata = stream
EOF
fi
systemctl daemon-reload
systemctl enable --now kk-watch >/dev/null 2>&1
systemctl restart smbd kk-watch
ok "studio folders, drop-folder automation, network share"

# ---- Open WebUI -----------------------------------------------------------------
say "Installing Open WebUI (chat page for the agents)"
if [[ ! -x $WEBUI/bin/open-webui ]]; then
    python3 -m venv "$WEBUI" || die "could not create $WEBUI"
    "$WEBUI/bin/pip" install -q --upgrade pip >/dev/null
    "$WEBUI/bin/pip" install -q open-webui >/dev/null || warn "Open WebUI install failed (the agents still work in Terminal)"
fi
if [[ -x $WEBUI/bin/open-webui ]]; then
    mkdir -p "$WEBUI/data"
    cat > /etc/systemd/system/open-webui.service <<EOF
[Unit]
Description=Open WebUI
After=network.target ollama.service

[Service]
Environment=DATA_DIR=$WEBUI/data
Environment=OLLAMA_BASE_URL=http://127.0.0.1:11434
Environment=WEBUI_NAME=Knight Lyfe AI Studio
ExecStart=$WEBUI/bin/open-webui serve --host 0.0.0.0 --port 8080
Restart=always

[Install]
WantedBy=multi-user.target
EOF
    systemctl daemon-reload
    systemctl enable --now open-webui >/dev/null 2>&1
    systemctl restart open-webui
    ok "open-webui"
fi

# ---- Done -------------------------------------------------------------------------
IP=$(hostname -I | awk '{print $1}')
say "Knight Lyfe AI Studio is ready"
cat <<EOF

  CHAT WITH THE AGENTS (on the Mac, in Chrome)
     http://$IP:8080
     Make an account the first time (the first account is the admin).
     Pick kk-mix, kk-sound or kk-producer at the top. First start takes a minute.

  STUDIO FOLDER ON THE MAC
     Finder > Go > Connect to Server >  smb://$IP/studio
     User: studio    Password: in $CREDS  (cat $CREDS)
     Drop a song into:
       inbox/stems   -> vocals/drums/bass/other appear in outbox/stems
       inbox/master  -> a mastered WAV appears in outbox/master
                        (put a finished song you like in references/ first)
       inbox/lyrics  -> a lyrics .txt appears in outbox/lyrics

  IN TERMINAL (here)
     ollama run kk-mix          ask the mix engineer
     kk-stems song.mp3          kk-master mix.wav ref.wav          kk-lyrics song.mp3

  This machine has no graphics card, so answers and stems take a little
  while (a few minutes for a full song). That's normal.
EOF
