#!/bin/bash
# Knight Lyfe Sound Library - builds your own organized sound library on a drive
# and links it into Logic Pro so it shows up in Logic's Library and Browser.
#
#   bash setup-library.sh                          (asks which drive)
#   bash setup-library.sh "/Volumes/KNIGHT LYFE INC"
#   bash setup-library.sh --check                  (only report what's where)
#
# Safe to run again: it never deletes or overwrites your sounds.

set -u
NAME="Knight Lyfe Sound Library"
CONF="$HOME/.knightlyfe-library"
LOGIC_USER="$HOME/Music/Audio Music Apps"

bold() { printf '\n\033[1m%s\033[0m\n' "$*"; }
ok() { printf '  \033[32m✓\033[0m %s\n' "$*"; }
warn() { printf '  \033[33m!\033[0m %s\n' "$*"; }
size() { du -sh "$1" 2>/dev/null | cut -f1; }

# ---- What's where (Logic's own library and free space) ------------------------
report() {
    bold "Logic Pro sound library"
    for d in "/Library/Application Support/Logic" "/Library/Application Support/GarageBand" "/Library/Audio/Apple Loops/Apple"; do
        if [[ -e "$d" ]]; then
            real="$(cd "$d" 2>/dev/null && pwd -P)"
            if [[ "$real" != "$d" ]]; then ok "$d -> $real ($(size "$d"))"; else ok "$d ($(size "$d"), on the Mac's drive)"; fi
        else
            warn "$d not found"
        fi
    done
    bold "Free space"
    df -h / | awk 'NR==2 {print "  Mac drive: " $4 " free of " $2}'
    for v in /Volumes/*; do
        [[ -d "$v" && "$v" != "/Volumes/Macintosh HD" ]] || continue
        df -h "$v" 2>/dev/null | awk -v n="$v" 'NR==2 {print "  " n ": " $4 " free of " $2}'
    done
    if [[ -f "$CONF" ]]; then
        bold "Your library"
        root="$(cat "$CONF")"
        if [[ -d "$root" ]]; then ok "$root ($(size "$root"))"; else warn "$root (drive not connected?)"; fi
    fi
}

if [[ "${1:-}" == "--check" ]]; then
    report
    exit 0
fi

# ---- Pick the drive ----------------------------------------------------------
DRIVE="${1:-}"
if [[ -z "$DRIVE" ]]; then
    bold "Where should the Knight Lyfe Sound Library live?"
    echo "  (An external drive is best: sounds take a lot of space.)"
    options=()
    for v in /Volumes/*; do
        [[ -d "$v" && -w "$v" && "$v" != "/Volumes/Macintosh HD" && "$v" != *"Recovery"* ]] && options+=("$v")
    done
    options+=("$HOME/Music (on this Mac)")
    i=1
    for o in "${options[@]}"; do echo "    $i) $o"; i=$((i + 1)); done
    printf "  Type a number and press Return: "
    read -r n
    [[ "$n" =~ ^[0-9]+$ && "$n" -ge 1 && "$n" -le ${#options[@]} ]] || { echo "Not a choice - nothing changed."; exit 1; }
    DRIVE="${options[$((n - 1))]}"
    [[ "$DRIVE" == "$HOME/Music (on this Mac)" ]] && DRIVE="$HOME/Music"
fi
[[ -d "$DRIVE" && -w "$DRIVE" ]] || { echo "Can't write to \"$DRIVE\". Is the drive connected?"; exit 1; }

ROOT="$DRIVE/$NAME"
bold "Building $ROOT"

# ---- Folders ---------------------------------------------------------------------
FOLDERS=(
    "Drums/Kicks" "Drums/Snares" "Drums/Claps & Snaps" "Drums/Hi-Hats" "Drums/Cymbals" "Drums/Toms"
    "Drums/Percussion" "Drums/808s" "Drums/Drum Loops" "Drums/Kits"
    "Keys/Piano" "Keys/Organ" "Keys/Electric Piano" "Keys/Synth Keys"
    "Bass/808 Bass" "Bass/Synth Bass" "Bass/Live Bass"
    "Synths/Pads" "Synths/Leads" "Synths/Plucks" "Synths/Arps"
    "Guitars" "Strings & Brass" "Choir & Vocals/Choir" "Choir & Vocals/Vocal Chops" "Choir & Vocals/Ad-libs" "Choir & Vocals/Acapellas"
    "FX/Risers & Sweeps" "FX/Impacts" "FX/Transitions" "FX/Ambience & Textures"
    "Loops" "MIDI/Chord Progressions" "MIDI/Drum Grooves" "MIDI/Melodies"
    "Stems" "Sampler Instruments" "Patches" "Channel Strip Settings" "Project Templates"
    "Knight Lyfe Kit Rack" "Inbox (drop new sounds here)" "Inbox (drop new sounds here)/Unsorted"
)
for f in "${FOLDERS[@]}"; do mkdir -p "$ROOT/$f"; done
ok "${#FOLDERS[@]} folders"
echo "$ROOT" > "$CONF"

cat > "$ROOT/READ ME.txt" <<EOF
KNIGHT LYFE SOUND LIBRARY
=========================
Made by setup-library.sh. Everything here also shows up in Logic Pro:

  Sampler Instruments  -> Logic: Sampler / Quick Sampler instrument menu, folder "Knight Lyfe"
  Patches              -> Logic: Library (Y) > User Patches > Knight Lyfe
  Channel Strip Settings -> Logic: channel strip Setting menu > Knight Lyfe
  Project Templates    -> Logic: File > New from Template > My Templates
  Loops                -> drag loops into Logic's Loop Browser (O) once to add
                          them as Apple Loops; they appear under "My Loops"
  Everything else      -> Logic: Browsers (F) > All Files > this folder
                          (drag it to the Finder sidebar for one-click access)

New sounds: drop them in "Inbox (drop new sounds here)" and run
  bash organize-samples.sh
to sort them into the right folders by name (kick, snare, 808, pad, choir...).

Saving your own sounds in Logic:
  - Patch: Library > Save (bottom of the Library) into Patches/Knight Lyfe
  - Sampler instrument: Sampler > Save As into Sampler Instruments
  - Drum kit: build it in Drum Machine Designer, then save it as a patch
EOF

# ---- Link into Logic --------------------------------------------------------------
bold "Linking it into Logic Pro"
link() { # link <target in library> <folder Logic reads> <name>
    mkdir -p "$2"
    if [[ -e "$2/$3" && ! -L "$2/$3" ]]; then
        warn "$2/$3 already exists as a real folder - left as it is"
        return
    fi
    ln -sfn "$1" "$2/$3" && ok "$3 -> ${2/#$HOME/~}"
}
link "$ROOT/Sampler Instruments" "$LOGIC_USER/Sampler Instruments" "Knight Lyfe"
link "$ROOT/Patches" "$LOGIC_USER/Patches/Instrument" "Knight Lyfe"
link "$ROOT/Channel Strip Settings" "$LOGIC_USER/Channel Strip Settings/Instrument" "Knight Lyfe"
link "$ROOT/Project Templates" "$LOGIC_USER/Project Templates" "Knight Lyfe"

# The Kit Rack samples from the Knight Lyfe Ultimate plug-in, so you can use them in Logic too.
KIT="$HOME/Library/Application Support/Knight Lyfe/Kit"
if [[ -d "$KIT" ]]; then
    ln -sfn "$KIT" "$ROOT/Knight Lyfe Kit Rack/Plug-in kit (live)" && ok "Kit Rack samples from the plug-in"
fi

# One-click access from Finder (a link in your Music folder; drag the library to the sidebar too).
if [[ "$ROOT" != "$HOME/Music/$NAME" ]]; then
    if [[ -e "$HOME/Music/$NAME" && ! -L "$HOME/Music/$NAME" ]]; then
        warn "~/Music/$NAME already exists - no shortcut made"
    else
        mkdir -p "$HOME/Music" && ln -sfn "$ROOT" "$HOME/Music/$NAME" && ok "Shortcut in your Music folder"
    fi
fi

# Sound packs that came with these tools (Knight Lyfe Drums, Gospel MIDI, ...).
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [[ -d "$HERE/Sound Packs" ]]; then
    bold "Installing the sound packs"
    for pack in "$HERE/Sound Packs"/*/; do
        [[ -d "$pack" ]] || continue
        name="$(basename "$pack")"
        bash "$HERE/organize-samples.sh" --pack "$pack" >/dev/null && ok "$name"
        if [[ -f "$pack/LICENSE.txt" ]]; then
            mkdir -p "$ROOT/Licenses" && cp -p "$pack/LICENSE.txt" "$ROOT/Licenses/$name.txt"
        fi
    done
fi

report

bold "Done"
cat <<EOF
  * Restart Logic Pro so it sees the new folders.
  * The sound packs are in their folders under the pack's name, e.g.
    Drums/Kicks/Knight Lyfe Drums Vol 1 and MIDI/Chord Progressions/Knight Lyfe Gospel MIDI.
  * Drop sounds into "Inbox (drop new sounds here)" and run:
        bash "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/organize-samples.sh"
  * Logic's own sounds: Logic Pro > Sound Library > Relocate Sound Library...
    to the same drive, then Sound Library > Download All Available Sounds.
EOF
command -v open >/dev/null && open "$ROOT" 2>/dev/null
exit 0
