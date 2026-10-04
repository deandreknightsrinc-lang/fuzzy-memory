# Knight Lyfe Proxmox cluster: 4 nodes

How to grow the one Proxmox server (`pve`, the Dell OptiPlex 9010 SFF) into a
4-node cluster: one place to manage everything, VMs that move between
machines while running, copies of every machine on a second node, and the
important ones restarting by themselves if a node dies.

```
                     home router (192.168.1.1)
                              |
                    8-port gigabit switch
      ┌──────────┬────────────┼────────────┬──────────────┐
      |          |            |            |              |
    pve        pve2         pve3         pve4        qdevice (Raspberry Pi)
 OptiPlex 9010  OptiPlex     OptiPlex     OptiPlex    tie-breaker vote only
 SFF + RTX A2000 7080 Micro  7080 Micro   7080 Micro
 kl-oracle (GPU), the VMs spread across all four
      |
   UPS (USB) ── tells every node to shut down cleanly when the battery runs low
```

Written for Proxmox VE 9. Every step shows where to click in the web page
(`https://192.168.1.52:8006`) and the same thing as a shell command.

---

## 0. The plan

| Name | Machine | IP address | Job |
|---|---|---|---|
| `pve` | OptiPlex 9010 SFF (i7-3770, 32 GB) | 192.168.1.52 (now) | The GPU node: kl-oracle and the AI. The other guests can move off it |
| `pve2` | OptiPlex 7080 Micro | 192.168.1.53 | VMs, replica target |
| `pve3` | OptiPlex 7080 Micro | 192.168.1.54 | VMs, replica target |
| `pve4` | OptiPlex 7080 Micro | 192.168.1.55 | VMs, replica target |
| `qdevice` | Raspberry Pi 4/5 | 192.168.1.56 | Tie-breaker vote (no VMs) |

- Use addresses your router won't hand out to other devices: reserve them in
  the router's DHCP settings, or pick ones outside its DHCP range.
- **Pick the names now.** Renaming a node after it joins a cluster is
  painful. The cluster's own name (`knightlyfe` below) can never change.
- **Storage plan:** every node gets a ZFS pool called `rpool` with VM disks in
  `rpool/data`, shown in Proxmox as the storage **`local-zfs`**. Replication
  only works when the storage has the same name on both ends, so the old node
  gets the same layout on its new SSD (step 2).
- **Why a Raspberry Pi:** a cluster stays in control only while more than half
  the votes are present. With 4 nodes that means 3; two nodes down at once
  would freeze it. The Pi adds a 5th vote, so the cluster keeps running with
  any 2 nodes down. It runs one small service and nothing else.

**Shopping list** (see the chat for current prices): 3 × OptiPlex 7080 Micro
(i5 10th gen, 16 GB, 512 GB NVMe), a 1 TB SATA SSD for `pve` with a 2.5"→3.5"
bracket, an 8-port gigabit switch, Cat6 cables, a CyberPower CP1500PFCLCD UPS,
and a Raspberry Pi 4 or 5 with a power supply and a 32 GB+ microSD card.

---

## 1. Before you start: back up

On `pve`, back up every guest to somewhere that isn't `pve`'s own disk (a USB
drive works, see step 9):

- **Web page:** Datacenter > Backup > *Run now*, or each guest > Backup > *Backup now*.
- **Shell:** `vzdump --all 1 --mode snapshot --storage <your backup storage>`

Then write down how `pve` is set up: `pvesm status` (storage) and `qm list; pct list` (guests).

---

## 2. Give `pve` its new SSD (the `local-zfs` layout)

Fit the 1 TB SATA SSD in the 3.5" bay with the bracket (or in the optical bay
with a caddy), on one of the two **SATA 6 Gb/s** ports. Then on `pve` > Shell:

```bash
ls -l /dev/disk/by-id/ | grep -v part      # find the new SSD, e.g. ata-Samsung_SSD_870_EVO_1TB_S6P...
```

```bash
# Replace the name with yours. This ERASES that disk, so double-check it is the new SSD.
DISK=/dev/disk/by-id/ata-Samsung_SSD_870_EVO_1TB_XXXXXXXXXXXX
zpool create -o ashift=12 -O compression=lz4 -O atime=off rpool "$DISK"
zfs create rpool/data
pvesm add zfspool local-zfs --pool rpool/data --content images,rootdir --sparse 1
# ZFS uses spare RAM as a cache; keep it to 4 GB so the VMs have room
echo "options zfs zfs_arc_max=4294967296" > /etc/modprobe.d/zfs.conf
update-initramfs -u -k all
```

(If the SSD was used before, wipe it first: `pve` > Disks > select it > *Wipe Disk*.)

Move each guest's disk to the SSD (it can stay running):

- **VM:** VM > Hardware > Hard Disk > *Disk Action* > *Move Storage* > `local-zfs`, tick *Delete source*.
- **Container:** CT > Resources > Root Disk > *Volume Action* > *Move Storage* > `local-zfs`, tick *Delete source*.
- **Shell:** `qm disk move <vmid> scsi0 local-zfs --delete 1` or `pct move-volume <ctid> rootfs local-zfs --delete 1`

Everything gets faster, and the guests are now ready for replication.

**VM processor type:** VMs that should move between nodes need a CPU type
every node has. VM > Hardware > Processors > Type: **`x86-64-v2-AES`**
(the old i7-3770 supports it; `host` would block moves to and from it).
Containers don't need this.

---

## 3. Set up the three new nodes

### BIOS (press F2 at the Dell logo)
- **System Configuration > SATA Operation: AHCI** (Dell ships "RAID On", which hides the NVMe drive from Linux)
- **Virtualization Support:** Virtualization **on**, VT for Direct I/O **on**
- **Secure Boot: off** (simplest)
- **Power Management > AC Recovery: Power On** (comes back by itself after a power cut)
- **Wake on LAN: LAN only** (lets you wake it from the web page later)

### Install Proxmox
1. Download the Proxmox VE 9 ISO from proxmox.com and write it to a USB stick (balenaEtcher on the Mac).
2. Boot the Micro from it (F12 > USB).
3. **Target disk:** the NVMe. Click *Options* > Filesystem **zfs (RAID0)**. This makes the `rpool` pool.
4. **Network:** hostname `pve2.lan` (then `pve3.lan`, `pve4.lan`), IP `192.168.1.53/24` (then .54, .55), gateway `192.168.1.1`, DNS `192.168.1.1`.
5. Use the same root password style you use on `pve` and keep it in your password manager.

After it reboots, open `https://192.168.1.53:8006`, log in as `root`, then
in its Shell:

```bash
# Package sources for home use (no subscription), then update
for f in pve-enterprise ceph; do
  [ -f /etc/apt/sources.list.d/$f.sources ] && mv /etc/apt/sources.list.d/$f.sources /etc/apt/sources.list.d/$f.sources.off
done
cat > /etc/apt/sources.list.d/proxmox.sources <<'EOF'
Types: deb
URIs: http://download.proxmox.com/debian/pve
Suites: trixie
Components: pve-no-subscription
Signed-By: /usr/share/keyrings/proxmox-archive-keyring.gpg
EOF
apt update && apt full-upgrade -y
```

(Or click it: node > Updates > Repositories: disable *enterprise*, *Add* > *No-Subscription*, then Updates > *Upgrade*.)

**A new node must have no VMs or containers before it joins.** Don't create any yet.

---

## 4. Create the cluster (on `pve`)

- **Web page:** Datacenter > Cluster > *Create Cluster*. Name: `knightlyfe`. Link 0: `192.168.1.52`. *Create*.
- **Shell:** `pvecm create knightlyfe`

`pve`'s existing guests stay as they are.

---

## 5. Join `pve2`, `pve3`, `pve4` (one at a time)

1. On `pve`: Datacenter > Cluster > *Join Information* > *Copy Information*.
2. On `pve2`'s web page: Datacenter > Cluster > *Join Cluster*, paste, enter `pve`'s root password, *Join*.
   (Shell on pve2: `pvecm add 192.168.1.52`)
3. Its page reloads. Log in at `https://192.168.1.52:8006` from now on: all four nodes show up there.
4. Wait until it shows green in the tree, then do the next one.

Check on any node:

```bash
pvecm status     # "Quorate: Yes" and 4 nodes
pvecm nodes
```

### Fix the storage list (once, after all three joined)

A node that joins takes the cluster's storage list and drops its own, so the
new nodes' `local-zfs` and `pve`'s old `local-lvm` need sorting:

- Datacenter > Storage > **`local-zfs`** > Edit > *Nodes*: **All** (pve has it from step 2; the Micros have it from their install).
- Datacenter > Storage > **`local-lvm`** > Edit > *Nodes*: **pve** only (the Micros don't have it).

Shell:
```bash
pvesm set local-zfs --nodes pve,pve2,pve3,pve4
pvesm set local-lvm --nodes pve
```

---

## 6. The tie-breaker vote (Raspberry Pi QDevice)

1. Write **Raspberry Pi OS Lite (64-bit)** to the microSD with Raspberry Pi Imager. In its settings: hostname `qdevice`, enable SSH, your user and password.
2. Boot it, give it the address `192.168.1.56` (router reservation), and log in: `ssh <you>@192.168.1.56`.
3. On the Pi:
   ```bash
   sudo apt update && sudo apt install -y corosync-qnetd
   sudo passwd root                                   # a temporary root password
   sudo sed -i 's/^#\?PermitRootLogin.*/PermitRootLogin yes/' /etc/ssh/sshd_config
   sudo systemctl restart ssh
   ```
4. On **every** node (pve, pve2, pve3, pve4):
   ```bash
   apt install -y corosync-qdevice
   ```
5. On `pve` only:
   ```bash
   pvecm qdevice setup 192.168.1.56                  # asks for the Pi's root password once
   ```
6. Lock the Pi's root login back down (the setup installed keys, so the password isn't needed again):
   ```bash
   sudo sed -i 's/^PermitRootLogin yes/PermitRootLogin prohibit-password/' /etc/ssh/sshd_config && sudo systemctl restart ssh
   ```
7. Check on `pve`: `pvecm status` now lists *Qdevice* and **Expected votes: 5**.

---

## 7. Replication: a second copy of each guest

Replication copies a guest's disks to another node every few minutes (only the
changes, so it's quick). If a node dies, the copy is at most one interval old.

- **Web page:** Datacenter > Replication > *Add*: guest, target node, schedule `*/15` (every 15 minutes).
- **Shell:** `pvesr create-local-job <id>-0 <target> --schedule "*/15"`

A suggested layout (adjust to where each guest ends up running):

| Guest | Runs on | Replicate to | Why |
|---|---|---|---|
| 112 kl-oracle | pve (GPU) | pve2 | Spare copy for a manual restore (see the GPU note in step 8) |
| 110 kl-vault | pve2 | pve3 | |
| 100 Bishop | pve3 | pve4 | |
| 111 kl-desk | pve4 | pve2 | |
| 101 cat | pve2 | pve4 | |

Move a running VM to another node: right-click it > *Migrate* > target > *Migrate* (online).
Containers restart during a move: right-click > *Migrate*, tick *Restart mode*.

A disk you never want copied (a big sound-library disk, for example): VM > Hardware >
the disk > Edit > untick **Replicate** (and **Backup** if it's backed up some other way).

---

## 8. High availability: restart automatically when a node dies

HA watches chosen guests. If their node stops answering for about 2 minutes,
the guest starts on another node from its newest replica.

- **Web page:** Datacenter > HA > Resources > *Add*: guest ID, Requested state **started**.
- **Shell:** `ha-manager add vm:110 --state started` (`ct:` for containers)

To prefer where a guest runs, add a **node affinity rule** (Datacenter > HA >
Rules; older versions call these *HA groups*): for example kl-vault prefers
`pve2`, then `pve3`.

**GPU note: kl-oracle stays out of HA.** It uses the A2000, and only `pve`
has that card. Started on another node it would fail looking for
`/dev/nvidia0`. If `pve` ever dies, start the replica on `pve2` by hand
without the GPU (it then runs on the CPU, slower):

```bash
# on pve2, only while pve is really off
mv /etc/pve/nodes/pve/lxc/112.conf /etc/pve/nodes/pve2/lxc/112.conf
sed -i '/^dev[0-9]*: \/dev\/nvidia/d' /etc/pve/nodes/pve2/lxc/112.conf
pct start 112
```

When `pve` is back, migrate it home and run `ai-studio/gpu-setup.sh` on `pve` again to restore the GPU lines.

**Maintenance:** before shutting a node down for work, move its guests off:
```bash
ha-manager crm-command node-maintenance enable pve3    # HA guests move away
# ...work, reboot...
ha-manager crm-command node-maintenance disable pve3
```

---

## 9. Backups (replication is not a backup)

Replication copies mistakes too, so keep real backups.

Simplest: a USB hard drive on `pve`:
1. Plug it in. `pve` > Disks > *Wipe Disk* (if used), then Disks > Directory > *Create*:
   filesystem ext4, name `backup-usb`, tick *Add Storage*.
2. Datacenter > Storage > `backup-usb` > Edit > Content: **VZDump backup file** only.
3. Datacenter > Backup > *Add*: Storage `backup-usb`, Schedule `02:00`, Selection **All**,
   Mode **Snapshot**, Retention: keep daily **7**, weekly **4**, monthly **3**.

Test a restore now and then: a backup > *Restore* to a new ID, start it, check it, delete it.

Better later: a separate **Proxmox Backup Server** machine (keeps only changes,
much smaller backups), kept outside the cluster.

---

## 10. Power: the UPS shuts everything down cleanly

Plug `pve`, the three Micros, the switch, the router and the Pi into the UPS's
**battery** outlets, and the UPS's USB cable into `pve`. NUT (Network UPS
Tools) on `pve` reads the battery and tells all nodes to shut down before it
runs out.

On **pve** (choose your own password in place of `CHANGE-ME`):

```bash
apt install -y nut
cat > /etc/nut/nut.conf <<'EOF'
MODE=netserver
EOF
cat > /etc/nut/ups.conf <<'EOF'
[cyberpower]
  driver = usbhid-ups
  port = auto
  desc = "CyberPower CP1500PFCLCD"
EOF
cat > /etc/nut/upsd.conf <<'EOF'
LISTEN 0.0.0.0 3493
EOF
cat > /etc/nut/upsd.users <<'EOF'
[upsmon]
  password = CHANGE-ME
  upsmon primary
EOF
cat > /etc/nut/upsmon.conf <<'EOF'
MONITOR cyberpower@localhost 1 upsmon CHANGE-ME primary
SHUTDOWNCMD "/sbin/shutdown -h +0"
EOF
chmod 640 /etc/nut/upsd.users /etc/nut/upsmon.conf
systemctl restart nut-server nut-monitor
upsc cyberpower@localhost | grep -E 'battery.charge|ups.status'   # e.g. 100 and OL (on line)
```

On **pve2, pve3, pve4**:

```bash
apt install -y nut-client
echo "MODE=netclient" > /etc/nut/nut.conf
cat > /etc/nut/upsmon.conf <<'EOF'
MONITOR cyberpower@192.168.1.52 1 upsmon CHANGE-ME secondary
SHUTDOWNCMD "/sbin/shutdown -h +0"
EOF
chmod 640 /etc/nut/upsmon.conf
systemctl restart nut-monitor
```

With *AC Recovery: Power On* set in each BIOS, everything starts again by
itself when the power comes back, and the guests marked *Start at boot*
(guest > Options) come up with it.

---

## 11. Checklist and quick fixes

- [ ] `pvecm status`: Quorate **Yes**, 4 nodes + Qdevice, expected votes 5
- [ ] Datacenter > Storage: `local-zfs` on all nodes, `local-lvm` on pve only
- [ ] Datacenter > Replication: every job shows a recent *Last Sync* and no errors
- [ ] Datacenter > HA: resources *started*, no node in *fence* or *unknown*
- [ ] A test migration of one VM to each node and back
- [ ] A backup restored once
- [ ] Pull the UPS's wall plug for 30 seconds: `upsc cyberpower@localhost ups.status` shows `OB` (on battery), then `OL` again

| Problem | Fix |
|---|---|
| Join fails: "this host already contains virtual guests" | Only empty nodes can join. Move or remove its guests first |
| A Micro doesn't see its NVMe in the installer | BIOS > SATA Operation: **AHCI** |
| Migration refused: CPU type | VM > Hardware > Processors > Type **x86-64-v2-AES** |
| Replication fails: storage not found | The guest's disk isn't on `local-zfs`, or `local-zfs` isn't enabled for that node (step 5) |
| A node shows a grey question mark | `systemctl restart pve-cluster corosync` on it; check its network cable and `ping` between nodes |
| "Not quorate" with most nodes down | Get nodes back up. Only in an emergency, on a node you trust: `pvecm expected 1` (undo by bringing the others back) |
| Removing a node for good | Power it off for good, then on another node `pvecm delnode pve4` |

Related: `ai-studio/gpu-setup.sh` (the A2000 on `pve`) and `ai-studio/setup.sh`
(the AI Studio inside kl-oracle).
