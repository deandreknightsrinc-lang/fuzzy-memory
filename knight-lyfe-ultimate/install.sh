#!/bin/bash
# Knight Lyfe Ultimate - one-step Mac installer.
#
# Run it from Terminal (it sits next to the zips in the download):
#     bash ~/Downloads/Knight-Lyfe-Ultimate-macOS/install.sh
#
# It unzips the plug-ins, copies them where Logic and the Finder look for them,
# clears the "downloaded from the internet" block, re-signs them for this Mac and
# asks macOS to re-scan Audio Units. Your Mac password is needed once (sudo).

set -u
NAME="Knight Lyfe Ultimate"
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORK="$(mktemp -d /tmp/knightlyfe.XXXXXX)"
trap 'rm -rf "$WORK"' EXIT

AU_DIR="/Library/Audio/Plug-Ins/Components"
VST3_DIR="/Library/Audio/Plug-Ins/VST3"
APP_DIR="/Applications"

say() { printf '\n\033[1m%s\033[0m\n' "$*"; }
ok() { printf '  \033[32m✓\033[0m %s\n' "$*"; }
warn() { printf '  \033[33m!\033[0m %s\n' "$*"; }

if [[ "$(uname)" != "Darwin" ]]; then
    echo "This installer is for macOS."; exit 1
fi

# Find a bundle (.component / .vst3 / .app): already unzipped next to this script,
# or inside one of the zips next to it. Prints its path, or nothing.
find_bundle() {
    local ext="$1" place found zip
    for place in "$HERE" "$HOME/Downloads/Knight-Lyfe-Ultimate-macOS" "$HOME/Downloads"; do
        [[ -d "$place" ]] || continue
        found="$(find "$place" -maxdepth 3 -name "$NAME.$ext" -type d -not -path "*/$NAME.*/*" 2>/dev/null | head -n 1)"
        [[ -n "$found" ]] && { echo "$found"; return; }
        for zip in "$place"/*.zip "$place"/*/*.zip; do
            [[ -f "$zip" ]] || continue
            unzip -l "$zip" 2>/dev/null | grep -q "$NAME.$ext/" || continue
            local out="$WORK/$ext"
            mkdir -p "$out"
            ditto -x -k "$zip" "$out" 2>/dev/null
            found="$(find "$out" -maxdepth 3 -name "$NAME.$ext" -type d | head -n 1)"
            [[ -n "$found" ]] && { echo "$found"; return; }
        done
    done
}

# Copy a bundle into place, unblock it and sign it for this Mac.
install_bundle() {
    local src="$1" dest_dir="$2" label="$3"
    local dest="$dest_dir/$NAME.${src##*.}"
    sudo mkdir -p "$dest_dir"
    sudo rm -rf "$dest"
    if ! sudo ditto "$src" "$dest"; then
        warn "Could not copy the $label to $dest_dir"; return 1
    fi
    sudo xattr -dr com.apple.quarantine "$dest" 2>/dev/null
    sudo xattr -cr "$dest" 2>/dev/null
    sudo codesign --force --deep --sign - "$dest" >/dev/null 2>&1 || warn "Could not re-sign the $label (it may still work)"
    ok "$label -> $dest"
}

say "Installing $NAME"
echo "Your Mac password is needed to copy into /Library and /Applications."
echo "(Nothing shows while you type it - that is normal. Then press Return.)"
sudo -v || { echo "Password not accepted - nothing was installed."; exit 1; }

AU="$(find_bundle component)"
VST3="$(find_bundle vst3)"
APP="$(find_bundle app)"

if [[ -z "$AU$VST3$APP" ]]; then
    echo
    echo "I couldn't find the plug-in files. Keep install.sh in the same folder as the"
    echo "three .zip files from the download (Knight-Lyfe-Ultimate-macOS) and run it again."
    exit 1
fi

say "Copying"
if [[ -n "$AU" ]]; then install_bundle "$AU" "$AU_DIR" "Logic plug-in (Audio Unit)"; else warn "Logic plug-in (.component) not found"; fi
if [[ -n "$VST3" ]]; then install_bundle "$VST3" "$VST3_DIR" "VST3 plug-in"; else warn "VST3 plug-in not found (only needed for other DAWs)"; fi
if [[ -n "$APP" ]]; then install_bundle "$APP" "$APP_DIR" "Standalone app"; else warn "Standalone app not found"; fi

say "Asking macOS to re-scan Audio Units"
killall -9 AudioComponentRegistrar >/dev/null 2>&1
sleep 2
if [[ -n "$AU" ]]; then
    if auval -v aumu Kkey Klyf 2>&1 | grep -q "AU VALIDATION SUCCEEDED"; then
        ok "Audio Unit validated - Logic will load it"
    else
        warn "macOS didn't validate the Audio Unit yet. Restart the Mac, then in Logic open"
        warn "Settings > Plug-in Manager, select Knight Lyfe Ultimate and click Reset & Rescan Selection."
    fi
fi

say "Done!"
cat <<'EOF'
  * Quit Logic Pro completely (Cmd+Q) and open it again.
  * New track > Software Instrument, then in the Instrument slot:
        AU Instruments > Knight Lyfe > Knight Lyfe Ultimate
  * Standalone app: Applications > Knight Lyfe Ultimate
    (if macOS still says it can't be opened: right-click it > Open > Open).
EOF
