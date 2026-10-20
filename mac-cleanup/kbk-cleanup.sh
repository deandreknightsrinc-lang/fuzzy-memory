#!/bin/bash
# KBK Mac clean-up: see what's filling the Mac (including "System Data"), move
# Downloads / Documents / Desktop to the external drive, and clear caches.
#
#   bash kbk-cleanup.sh                 # report only: changes nothing
#   bash kbk-cleanup.sh --sound-library # build your Knight Lyfe Sound Library on the drive
#                                         and show where Logic's own library is / how to move it
#   bash kbk-cleanup.sh --downloads     # move everything in Downloads to the drive: stems and
#                                         samples into your Sound Library, the rest to KBK-Offload
#   bash kbk-cleanup.sh --documents     # go through Documents, biggest first, ask for each
#   bash kbk-cleanup.sh --desktop       # same for the Desktop
#   bash kbk-cleanup.sh --home          # your whole home folder: every file and folder of yours
#                                         goes to the drive; what macOS and your apps need stays
#   bash kbk-cleanup.sh --caches        # clear app caches (they rebuild themselves)
#   bash kbk-cleanup.sh --snapshots     # remove local Time Machine snapshots (System Data)
#   bash kbk-cleanup.sh --iphone-backups  # move iPhone/iPad backups to the drive
#   bash kbk-cleanup.sh --all           # all of the above, asking before each step
# Options:
#   --drive "/Volumes/NAME"   the external drive (default: KNIGHT LYFE INC - Data)
#   --dry-run                 show what would happen, change nothing
#   --yes                     move Downloads (or with --home, everything) without asking about each item
#
# Moving is copy, check, then delete: an item is only removed from the Mac
# after its copy on the drive has the same number of files and the same
# total size. Everything is logged on the drive in KBK-Offload/logs.
# Works with the bash that comes with macOS (3.2).

set -u
DRIVE="/Volumes/KNIGHT LYFE INC - Data"
DRY=0
YES=0
DO_LIBRARY=0 DO_DOWNLOADS=0 DO_DOCUMENTS=0 DO_DESKTOP=0 DO_CACHES=0 DO_SNAPSHOTS=0 DO_IPHONE=0 DO_HOME=0

while [[ $# -gt 0 ]]; do
    case "$1" in
        --sound-library) DO_LIBRARY=1 ;;
        --downloads) DO_DOWNLOADS=1 ;;
        --documents) DO_DOCUMENTS=1 ;;
        --desktop) DO_DESKTOP=1 ;;
        --caches) DO_CACHES=1 ;;
        --snapshots) DO_SNAPSHOTS=1 ;;
        --iphone-backups) DO_IPHONE=1 ;;
        --home) DO_HOME=1 ;;
        --all) DO_LIBRARY=1 DO_DOWNLOADS=1 DO_DOCUMENTS=1 DO_DESKTOP=1 DO_CACHES=1 DO_SNAPSHOTS=1 DO_IPHONE=1 ;;
        --drive) shift; DRIVE="${1:-}" ;;
        --dry-run) DRY=1 ;;
        --yes) YES=1 ;;
        -h|--help) sed -n '2,27p' "$0"; exit 0 ;;
        *) echo "Unknown option: $1 (try --help)" >&2; exit 1 ;;
    esac
    shift
done

bold() { printf '\n\033[1m%s\033[0m\n' "$*"; }
ok() { printf '  \033[32m✓\033[0m %s\n' "$*"; }
warn() { printf '  \033[33m!\033[0m %s\n' "$*"; }
info() { printf '    %s\n' "$*"; }

IS_MAC=0
[[ "$(uname)" == "Darwin" ]] && IS_MAC=1

# ---- sizes ----------------------------------------------------------------

short() { # /Users/you/Downloads/x -> ~/Downloads/x
    case "$1" in "$HOME"/*) printf '%s\n' "~${1#"$HOME"}" ;; *) printf '%s\n' "$1" ;; esac
}

kb_of() { du -sk "$1" 2>/dev/null | awk '{s+=$1} END {print s+0}'; }

human() { # KB -> "1.2 GB"
    awk -v k="$1" 'BEGIN {
        if (k >= 1048576) printf "%.1f GB", k/1048576;
        else if (k >= 1024) printf "%.0f MB", k/1024;
        else printf "%d KB", k }'
}

# number of files and total bytes: how a copy is checked
count_and_bytes() {
    local files bytes
    files=$(find "$1" -type f 2>/dev/null | wc -l | tr -d ' ')
    if [[ $IS_MAC == 1 ]]; then
        bytes=$(find "$1" -type f -exec stat -f %z {} + 2>/dev/null | awk '{s+=$1} END {print s+0}')
    else
        bytes=$(find "$1" -type f -exec stat -c %s {} + 2>/dev/null | awk '{s+=$1} END {print s+0}')
    fi
    echo "$files $bytes"
}

free_kb() { df -k "$1" 2>/dev/null | awk 'NR==2 {print $4}'; }

ask() { # ask "question" -> 0 for yes
    local a
    if [[ -n "${KBK_ANSWER:-}" ]]; then # tests answer for you
        echo "  $1 [y/N] $KBK_ANSWER"
        [[ "$KBK_ANSWER" == "y" ]]
        return
    fi
    read -r -p "  $1 [y/N] " a </dev/tty || return 1
    [[ "$a" == "y" || "$a" == "Y" || "$a" == "yes" ]]
}

# ---- the drive ----------------------------------------------------------------

DEST="$DRIVE/KBK-Offload"
LOG=""
need_drive() {
    if [[ ! -d "$DRIVE" ]]; then
        warn "The external drive isn't plugged in: $DRIVE"
        info "Plug it in, or say which one:  bash kbk-cleanup.sh --drive \"/Volumes/YOUR DRIVE\" ..."
        if [[ -d /Volumes ]]; then info "Drives I can see: $(ls /Volumes | tr '\n' ',' | sed 's/,$//; s/,/, /g')"; fi
        exit 1
    fi
    if [[ $DRY == 0 ]]; then
        mkdir -p "$DEST/logs" 2>/dev/null || { warn "Can't write to $DRIVE (is it read-only, or formatted for Windows only?)"; exit 1; }
        LOG="$DEST/logs/cleanup-$(date +%Y-%m-%d-%H%M%S).txt"
        echo "KBK clean-up $(date)" > "$LOG"
    fi
}

log() { [[ -n "$LOG" ]] && echo "$*" >> "$LOG"; }

# true if $1 really lives on the drive (for example through a linked folder)
on_drive() {
    local real drive_real
    real="$(cd "$(dirname "$1")" 2>/dev/null && pwd -P)" || return 1
    drive_real="$(cd "$DRIVE" 2>/dev/null && pwd -P)" || return 1
    case "$real/" in "$drive_real"/*) return 0 ;; esac
    return 1
}

# Copy $1 into folder $2 on the drive, check it, then remove the original.
move_item() {
    local src="$1" dest_dir="$2" name dest kb before after
    name="$(basename "$src")"
    if on_drive "$src"; then info "already on the drive: $name"; return 0; fi
    dest="$dest_dir/$name"
    if [[ -e "$dest" ]]; then # never overwrite: add a number
        local n=2 stem ext
        stem="${name%.*}"; ext=""
        [[ "$name" == *.* && -f "$src" ]] && ext=".${name##*.}" || stem="$name"
        while [[ -e "$dest_dir/$stem ($n)$ext" ]]; do n=$((n + 1)); done
        dest="$dest_dir/$stem ($n)$ext"
    fi
    kb=$(kb_of "$src")
    if [[ $DRY == 1 ]]; then
        info "would move  $name  ($(human "$kb"))  ->  ${dest#$DRIVE/}"
        return 0
    fi
    local free
    free=$(free_kb "$DRIVE")
    if [[ -z "$free" || $free -lt $((kb + 1048576)) ]]; then # keep 1 GB spare on the drive
        warn "Not enough room on the drive for $name ($(human "$kb")) - skipped"
        return 1
    fi
    mkdir -p "$dest_dir"
    if [[ $IS_MAC == 1 ]]; then
        ditto "$src" "$dest" 2>>"${LOG:-/dev/null}"
    else
        cp -a "$src" "$dest" 2>>"${LOG:-/dev/null}"
    fi
    before=$(count_and_bytes "$src")
    after=$(count_and_bytes "$dest")
    if [[ "$before" != "$after" ]]; then
        warn "The copy of $name doesn't match (files/bytes $before vs $after) - kept it on the Mac"
        log "MISMATCH $src -> $dest ($before vs $after)"
        rm -rf "$dest" # the half copy; dest was a new name, so nothing else is touched
        return 1
    fi
    rm -rf "$src"
    ok "$name  ($(human "$kb"))  ->  ${dest#$DRIVE/}"
    log "MOVED $src -> $dest ($before)"
    FREED_KB=$((FREED_KB + kb))
}

FREED_KB=0

# ---- your sound library --------------------------------------------------------------

HERE="$(cd "$(dirname "$0")" && pwd)"
LIB_NAME="Knight Lyfe Sound Library"

find_library() { # where setup-library.sh put it, or on the drive
    local conf="$HOME/.knightlyfe-library" root=""
    [[ -f "$conf" ]] && root="$(cat "$conf")"
    if [[ -n "$root" && -d "$root" ]]; then echo "$root"; return; fi
    [[ -d "$DRIVE/$LIB_NAME" ]] && echo "$DRIVE/$LIB_NAME"
}

is_audio() {
    case "$(echo "$1" | tr '[:upper:]' '[:lower:]')" in
        *.wav|*.wave|*.aif|*.aiff|*.mp3|*.flac|*.m4a|*.caf|*.ogg|*.mid|*.midi|*.rx2|*.rex) return 0 ;;
    esac
    return 1
}

# where something from Downloads belongs: Library/Stems, Library/Inbox, or KBK-Offload
destination_for() {
    local p="$1" lib="$2" name audio other
    name="$(basename "$p")"
    if [[ -n "$lib" ]]; then
        if [[ -d "$p" ]]; then
            case "$(echo "$name" | tr '[:upper:]' '[:lower:]')" in
                *stems*|*stem\ *|*acapella*|*instrumental*) echo "$lib/Stems"; return ;;
            esac
            # a sample pack: a folder that's mostly audio, with no apps or installers
            audio=$(find "$p" -type f \( -iname '*.wav' -o -iname '*.aif' -o -iname '*.aiff' -o -iname '*.mp3' -o -iname '*.flac' -o -iname '*.mid' \) 2>/dev/null | wc -l | tr -d ' ')
            other=$(find "$p" \( -iname '*.app' -o -iname '*.pkg' -o -iname '*.dmg' -o -iname '*.component' -o -iname '*.vst3' \) 2>/dev/null | wc -l | tr -d ' ')
            if [[ $audio -ge 3 && $other -eq 0 ]]; then echo "$lib/Inbox (drop new sounds here)"; return; fi
        elif is_audio "$name"; then
            echo "$lib/Inbox (drop new sounds here)"; return
        fi
    fi
    echo "$DEST/Downloads"
}

logic_library_report() {
    bold "Logic Pro sound library"
    local d real kb any=0
    for d in "/Library/Application Support/Logic" "/Library/Audio/Apple Loops/Apple" "/Library/Application Support/GarageBand"; do
        [[ -e "$d" ]] || continue
        any=1
        real="$(cd "$d" 2>/dev/null && pwd -P)"
        kb=$(kb_of "$d/")
        if [[ "$real" != "$d" ]]; then
            ok "$(human "$kb")   $d  ->  moved to $real"
        else
            printf '  %10s   %s  (on the Mac)\n' "$(human "$kb")" "$d"
        fi
    done
    [[ $any == 0 ]] && info "Not installed on this Mac yet."
    local lib; lib="$(find_library)"
    if [[ -n "$lib" ]]; then ok "Your Knight Lyfe Sound Library: $lib ($(human "$(kb_of "$lib")"))"
    else info "Your Knight Lyfe Sound Library isn't built yet: --sound-library builds it on the drive."; fi
}

# Items in a folder, biggest first: "KB<TAB>path"
items_by_size() {
    local dir="$1" p
    for p in "$dir"/* "$dir"/.[!.]*; do
        [[ -e "$p" ]] || continue
        case "$(basename "$p")" in
            .DS_Store|.localized|.Trash|.com.apple.timemachine.supported) continue ;;
            *.crdownload|*.download|*.part) continue ;; # still downloading
        esac
        printf '%s\t%s\n' "$(kb_of "$p")" "$p"
    done | sort -rn
}

# ---- report -------------------------------------------------------------------------

report_line() { # label path [note]
    local kb
    [[ -e "$2" ]] || return 0
    kb=$(kb_of "$2")
    [[ $kb -lt 102400 ]] && return 0 # under 100 MB isn't worth listing
    printf '  %10s   %s%s\n' "$(human "$kb")" "$1" "${3:+  - $3}"
}

top_of() { # biggest N items in a folder
    local dir="$1" n="$2" kb p
    [[ -d "$dir" ]] || return 0
    items_by_size "$dir" | head -n "$n" | while IFS=$'\t' read -r kb p; do
        [[ $kb -lt 102400 ]] && continue
        printf '  %10s   %s\n' "$(human "$kb")" "$(short "$p")"
    done
}

report() {
    bold "Free space"
    df -h / | awk 'NR==2 {print "  Mac:   " $4 " free of " $2}'
    [[ -d "$DRIVE" ]] && df -h "$DRIVE" | awk -v d="$DRIVE" 'NR==2 {print "  Drive: " $4 " free of " $2 "  (" d ")"}'

    if [[ $IS_MAC == 1 ]] && ! ls "$HOME/Library/Mail" >/dev/null 2>&1; then
        bold "Terminal can't see everything yet (that's why System Data is a mystery)"
        info "System Settings > Privacy & Security > Full Disk Access > turn on Terminal,"
        info "then quit Terminal (Cmd+Q), open it again and run this again."
    fi

    logic_library_report

    bold "Your folders"
    report_line "Downloads" "$HOME/Downloads" "--downloads moves it all to the drive"
    report_line "Documents" "$HOME/Documents" "--documents"
    report_line "Desktop" "$HOME/Desktop" "--desktop"
    report_line "Movies" "$HOME/Movies"
    report_line "Music" "$HOME/Music"
    report_line "Pictures" "$HOME/Pictures"
    report_line "Trash" "$HOME/.Trash" "empty it in Finder"

    bold "What macOS calls \"System Data\" (the biggest parts)"
    if [[ $IS_MAC == 1 ]]; then
        local snaps
        snaps=$(tmutil listlocalsnapshots / 2>/dev/null | grep -c 'com.apple')
        [[ "$snaps" -gt 0 ]] && printf '  %10s   %s\n' "$snaps snaps" "Time Machine local snapshots - --snapshots removes them (they can be many GB)"
    fi
    report_line "App caches" "$HOME/Library/Caches" "--caches clears them; apps rebuild what they need"
    report_line "iPhone/iPad backups" "$HOME/Library/Application Support/MobileSync/Backup" "--iphone-backups moves them to the drive"
    report_line "Xcode / developer tools" "$HOME/Library/Developer" "--caches clears DerivedData and old simulators"
    report_line "Docker" "$HOME/Library/Containers/com.docker.docker" "Docker Desktop > Settings > Resources to shrink"
    report_line "Ollama AI models" "$HOME/.ollama" "use the Proxmox server's Ollama instead and delete unused models: ollama rm NAME"
    report_line "KBK helper (AI tools)" "$HOME/.kbk-helper" "PyTorch for stems / AI Vox"
    report_line "Python/npm/Homebrew caches" "$HOME/.cache" "--caches"
    report_line "npm cache" "$HOME/.npm" "--caches"
    report_line "Logs" "$HOME/Library/Logs"
    report_line "Mail downloads" "$HOME/Library/Containers/com.apple.mail/Data/Library/Mail Downloads"
    report_line "Messages attachments" "$HOME/Library/Messages/Attachments" "Messages > Settings > keep messages: 1 year"
    report_line "Swap & sleep image" "/private/var/vm" "managed by macOS; a restart shrinks it"
    report_line "System caches" "/Library/Caches"
    report_line "Shared (sample libraries live here)" "/Users/Shared" "move with the app's own setting"
    echo
    info "Biggest app data in your Library:"
    top_of "$HOME/Library/Application Support" 8
    top_of "$HOME/Library/Containers" 5
    top_of "$HOME/Library/Group Containers" 4
    echo
    info "Biggest shared content (plug-in sound libraries: Output Arcade, Splice, Native Instruments, Logic...):"
    top_of "/Library/Application Support" 8
    top_of "/Users/Shared" 5
    info "Move plug-in libraries with the app itself (Arcade, Native Access, Splice settings; Logic: Sound Library > Relocate),"
    info "never by dragging the folders: the apps would lose them."

    bold "Biggest things in Downloads"
    top_of "$HOME/Downloads" 10
    bold "Biggest things in Documents"
    top_of "$HOME/Documents" 10
}

# ---- actions ------------------------------------------------------------------------

move_folder_contents() { # $1 = folder, $2 = name on the drive, $3 = ask each (1/0)
    local src="$1" name="$2" each="$3" kb p
    [[ -d "$src" ]] || return 0
    if [[ -L "$src" ]]; then
        bold "$name"
        ok "already a link to $(readlink "$src") - nothing on the Mac to move"
        return 0
    fi
    bold "Moving $name to the drive ($(human "$(kb_of "$src")"))"
    local dest_dir="$DEST/$name"
    items_by_size "$src" > "${TMPDIR:-/tmp}/kbk-items.$$"
    if [[ ! -s "${TMPDIR:-/tmp}/kbk-items.$$" ]]; then ok "$name is already empty"; return 0; fi
    local lib=""
    if [[ "$name" == "Downloads" ]]; then
        lib="$(find_library)"
        [[ -n "$lib" ]] && info "Stems go to your Sound Library's Stems folder, samples and packs to its Inbox." \
                        || info "Tip: run --sound-library first and stems/samples go straight into your own library."
    fi
    local reason
    while IFS=$'\t' read -r kb p; do
        reason="$(child_skip_reason "$p")"
        if [[ -n "$reason" ]]; then info "stays:  $(basename "$p") - $reason"; continue; fi
        if [[ "$each" == 1 ]]; then
            ask "Move \"$(basename "$p")\" ($(human "$kb")) to the drive?" || continue
        fi
        if [[ "$name" == "Downloads" ]]; then
            move_item "$p" "$(destination_for "$p" "$lib")"
        else
            move_item "$p" "$dest_dir" && [[ "$p" == *.photoslibrary && $DRY == 0 ]] && PHOTOS_MOVED="$dest_dir"
        fi
    done < "${TMPDIR:-/tmp}/kbk-items.$$"
    if [[ -n "$lib" && $DRY == 0 && -d "$lib/Inbox (drop new sounds here)" ]] && [[ -n "$(ls -A "$lib/Inbox (drop new sounds here)" 2>/dev/null | grep -v '^Unsorted$')" ]]; then
        info "New sounds are waiting in the library Inbox. Sort them with:"
        info "  bash \"$(cd "$HERE/../sound-library" 2>/dev/null && pwd)/organize-samples.sh\""
    fi
    rm -f "${TMPDIR:-/tmp}/kbk-items.$$"
}

# ---- the whole home folder ------------------------------------------------------------

# These folders stay (macOS and Finder expect them); what's inside them moves.
CONTENT_FOLDERS=" Desktop Documents Downloads Movies Music Pictures "
PHOTOS_MOVED=""

# The drive's format: apfs, hfs, exfat, msdos, ntfs ... (empty if unknown)
drive_fs() {
    mount 2>/dev/null | awk -v d="$DRIVE" '{ i = index($0, " on " d " (");
        if (i) { s = substr($0, i + length(d) + 6); sub(/[,)].*/, "", s); print s; exit } }'
}

drive_takes_mac_packages() { # Photos libraries need a Mac-formatted drive
    [[ $IS_MAC == 1 ]] || return 0
    case "$(drive_fs)" in apfs|hfs|"") return 0 ;; esac
    return 1
}

home_skip_reason() { # an item directly in ~ -> why it stays on the Mac (nothing = it can go)
    local p="$1" name
    name="$(basename "$p")"
    [[ -L "$p" ]] && { echo "a link to somewhere else"; return; }
    case "$name" in
        Library) echo "app settings, passwords (keychain), Logic's presets: macOS needs it on the Mac" ;;
        Applications) echo "apps stay on the Mac" ;;
        Public) echo "used by macOS file sharing" ;;
        fuzzy-memory|kbk-system) echo "your KBK tools run from here" ;;
        Splice) echo "Splice keeps its sounds here: move them in Splice > Settings > Sounds folder" ;;
        Claude) echo "used by the Claude app" ;;
        Dropbox*|"Google Drive"*|OneDrive*|"Creative Cloud Files"*|"iCloud Drive"*|Box|"Box Sync"|"pCloud Drive")
            echo "a cloud sync folder: moving files out of it deletes them from the cloud. Change its folder in that app's settings" ;;
    esac
}

child_skip_reason() { # an item inside Music, Pictures, Documents ... -> why it stays (nothing = it can go)
    local p="$1" name parent
    name="$(basename "$p")"
    parent="$(basename "$(dirname "$p")")"
    [[ -L "$p" ]] && { echo "a link (it already points somewhere else)"; return; }
    case "$parent/$name" in
        "Music/Audio Music Apps") echo "Logic's own presets, patches and channel strips: Logic looks for them here" ;;
        Music/Music|Music/iTunes) echo "the Music app's library: move its songs with the Music app (steps at the end)" ;;
        "Music/KBK Voices") echo "AI Vox voices: the KBK helper reads them here" ;;
        Movies/TV) echo "the TV app's library: move it with the TV app (steps at the end)" ;;
        *.photoslibrary)
            if ! drive_takes_mac_packages; then echo "Photos needs a drive formatted APFS or Mac OS Extended (this one is $(drive_fs))"
            elif [[ $IS_MAC == 1 ]] && pgrep -x Photos >/dev/null 2>&1; then echo "Photos is open: quit it and run this again"; fi ;;
        *.logicx)
            if [[ $IS_MAC == 1 ]] && pgrep -f "Logic Pro" >/dev/null 2>&1; then echo "Logic is open: quit it and run this again"; fi ;;
    esac
}

move_home() {
    bold "Your home folder ($(short "$HOME")) to the drive"
    info "Your files and folders go to the drive. What macOS and your apps need to run stays."
    echo
    local p name reason each=1
    for p in "$HOME"/*; do
        [[ -e "$p" || -L "$p" ]] || continue
        name="$(basename "$p")"
        reason="$(home_skip_reason "$p")"
        if [[ -n "$reason" ]]; then
            info "stays:  $name - $reason"
        elif [[ "$CONTENT_FOLDERS" == *" $name "* ]]; then
            info "moves:  everything in $name ($(human "$(kb_of "$p")")); the empty folder stays"
        else
            info "moves:  $name ($(human "$(kb_of "$p")"))  ->  KBK-Offload/Home"
        fi
    done
    info "Hidden settings (the names starting with a dot) always stay."
    if [[ $DRY == 0 && $YES == 0 ]]; then
        ask "Go ahead? It asks about each item; add --yes to move them all without asking" || return 0
    fi
    [[ $DRY == 1 || $YES == 1 ]] && each=0
    for name in $CONTENT_FOLDERS; do
        [[ -n "$(home_skip_reason "$HOME/$name")" ]] && continue
        move_folder_contents "$HOME/$name" "$name" "$each"
    done
    local header=0
    for p in "$HOME"/*; do
        [[ -e "$p" || -L "$p" ]] || continue
        name="$(basename "$p")"
        [[ "$CONTENT_FOLDERS" == *" $name "* || -n "$(home_skip_reason "$p")" ]] && continue
        [[ $header == 1 ]] || { bold "Your other files and folders to the drive (KBK-Offload/Home)"; header=1; }
        [[ $each == 1 ]] && { ask "Move \"$name\" ($(human "$(kb_of "$p")")) to the drive?" || continue; }
        move_item "$p" "$DEST/Home"
    done
    home_notes
}

home_notes() {
    bold "After the move"
    info "Everything is on the drive in $DEST (Home, Documents, Desktop, Music ...)."
    info "Drag that folder into Finder's sidebar to get to it in one click."
    info "Apps' \"recent files\" lists still point to the old places: open things from the drive."
    if [[ -n "$PHOTOS_MOVED" ]]; then
        info "Photos: hold Option while you open Photos, click Other Library and choose the library in"
        info "  $(short "$PHOTOS_MOVED"). If you use iCloud Photos: Photos > Settings > General > Use as System Photo Library."
    fi
    if [[ -d "$HOME/Music/Music" || -d "$HOME/Music/iTunes" ]]; then
        info "Music app songs: Music > Settings > Files > Change... (pick a folder on the drive), then"
        info "  File > Library > Organize Library > Consolidate files. Then delete the old Media folder in ~/Music/Music."
    fi
    [[ -d "$HOME/Movies/TV" ]] && info "TV app: TV > Settings > Files > Change..., then File > Library > Organize Library > Consolidate files."
    info "Keep the drive plugged in when you open these files. New downloads: set the browsers to save to the drive (see the README)."
}

clear_caches() {
    bold "Clearing caches"
    info "Quit your apps first (Logic, Chrome, Safari...): caches of open apps can come straight back."
    [[ $DRY == 1 ]] || ask "Clear the caches now?" || return 0
    local kb
    kb=$(kb_of "$HOME/Library/Caches")
    if [[ $DRY == 1 ]]; then info "would clear ~/Library/Caches ($(human "$kb"))"; else
        find "$HOME/Library/Caches" -mindepth 1 -maxdepth 1 -exec rm -rf {} + 2>/dev/null
        FREED_KB=$((FREED_KB + kb)); ok "App caches ($(human "$kb"))"; log "CLEARED ~/Library/Caches ($kb KB)"; fi
    local d
    for d in "$HOME/.cache/pip" "$HOME/.npm/_cacache" "$HOME/Library/Developer/Xcode/DerivedData" "$HOME/Library/Developer/CoreSimulator/Caches"; do
        [[ -d "$d" ]] || continue
        kb=$(kb_of "$d")
        if [[ $DRY == 1 ]]; then info "would clear $(short "$d") ($(human "$kb"))"; else
            rm -rf "$d"; FREED_KB=$((FREED_KB + kb)); ok "$(short "$d") ($(human "$kb"))"; log "CLEARED $d"; fi
    done
    if [[ $IS_MAC == 1 && $DRY == 0 ]]; then
        command -v xcrun >/dev/null 2>&1 && xcrun simctl delete unavailable >/dev/null 2>&1 && ok "Old iPhone simulators"
        command -v brew >/dev/null 2>&1 && brew cleanup --prune=all >/dev/null 2>&1 && ok "Homebrew downloads"
    fi
}

remove_snapshots() {
    [[ $IS_MAC == 1 ]] || return 0
    bold "Time Machine local snapshots"
    local n
    n=$(tmutil listlocalsnapshots / 2>/dev/null | grep -c 'com.apple')
    if [[ "$n" -eq 0 ]]; then ok "None on this Mac"; return 0; fi
    info "$n snapshot(s). They're copies Time Machine keeps on the Mac between backups;"
    info "your real backups on the Time Machine drive are not touched."
    [[ $DRY == 1 ]] && { info "would remove them"; return 0; }
    ask "Remove the local snapshots? (needs your password)" || return 0
    sudo tmutil thinlocalsnapshots / 999999999999 4 >/dev/null && ok "Local snapshots removed" && log "THINNED local snapshots"
}

build_sound_library() {
    bold "Your Knight Lyfe Sound Library"
    local setup="$HERE/../sound-library/setup-library.sh"
    if [[ ! -f "$setup" ]]; then warn "sound-library/setup-library.sh not found next to this tool (run it from the fuzzy-memory folder)"; return 1; fi
    if [[ $DRY == 1 ]]; then info "would build it in $DRIVE/$LIB_NAME and link it into Logic"; else
        bash "$setup" "$DRIVE" || warn "The library setup had a problem (see above)"
    fi
    bold "Logic's own sound library: put it on the drive (do this in Logic)"
    info "1. Plug in the drive, open Logic Pro."
    info "2. Menu: Logic Pro > Sound Library > Relocate Sound Library...  pick: $DRIVE"
    info "   Logic moves what's installed and keeps working with it from the drive."
    info "3. Then: Logic Pro > Sound Library > Download All Available Sounds"
    info "   (about 70 GB, straight onto the drive). Or download only what you use:"
    info "   Logic Pro > Sound Library > Open Sound Library Manager."
    info "4. Keep the drive plugged in when you use Logic."
}

move_iphone_backups() {
    local src="$HOME/Library/Application Support/MobileSync/Backup"
    [[ -d "$src" && ! -L "$src" ]] || return 0
    bold "iPhone/iPad backups ($(human "$(kb_of "$src")"))"
    info "They move to the drive and the Mac keeps a link, so Finder still backs up there"
    info "(with the drive plugged in)."
    [[ $DRY == 1 ]] && { info "would move them to KBK-Offload/iPhone Backups"; return 0; }
    ask "Move the backups?" || return 0
    local dest="$DEST/iPhone Backups"
    mkdir -p "$dest"
    ditto "$src" "$dest/Backup" && [[ "$(count_and_bytes "$src")" == "$(count_and_bytes "$dest/Backup")" ]] || { warn "Copy didn't match - kept them on the Mac"; return 1; }
    local kb; kb=$(kb_of "$src")
    rm -rf "$src" && ln -s "$dest/Backup" "$src" && ok "Backups moved ($(human "$kb"))" && FREED_KB=$((FREED_KB + kb)) && log "MOVED iPhone backups -> $dest/Backup"
}

# ---- go -----------------------------------------------------------------------------

ACTIONS=$((DO_LIBRARY + DO_DOWNLOADS + DO_DOCUMENTS + DO_DESKTOP + DO_CACHES + DO_SNAPSHOTS + DO_IPHONE + DO_HOME))
[[ $DRY == 1 ]] && bold "Dry run: nothing will change"
report
[[ $ACTIONS -eq 0 ]] && { echo; info "That was a report only. Add --downloads, --documents, --home, --caches ... or --all (see --help)."; exit 0; }

if [[ $((DO_LIBRARY + DO_DOWNLOADS + DO_DOCUMENTS + DO_DESKTOP + DO_IPHONE + DO_HOME)) -gt 0 ]]; then need_drive; fi
[[ $DO_LIBRARY == 1 ]] && build_sound_library
if [[ $DO_HOME == 1 ]]; then # covers Downloads, Documents and Desktop too
    move_home
    DO_DOWNLOADS=0 DO_DOCUMENTS=0 DO_DESKTOP=0
fi
if [[ $DO_DOWNLOADS == 1 ]]; then
    if [[ $YES == 1 || $DRY == 1 ]] || ask "Move EVERYTHING in Downloads to $DEST/Downloads?"; then
        move_folder_contents "$HOME/Downloads" "Downloads" 0
    fi
fi
[[ $DO_DOCUMENTS == 1 ]] && move_folder_contents "$HOME/Documents" "Documents" $((1 - DRY))
[[ $DO_DESKTOP == 1 ]] && move_folder_contents "$HOME/Desktop" "Desktop" $((1 - DRY))
[[ $DO_IPHONE == 1 ]] && move_iphone_backups
[[ $DO_CACHES == 1 ]] && clear_caches
[[ $DO_SNAPSHOTS == 1 ]] && remove_snapshots

bold "Done"
[[ $DRY == 1 ]] || info "Freed about $(human "$FREED_KB") on the Mac.${LOG:+ Log: $LOG}"
df -h / | awk 'NR==2 {print "    Mac now has " $4 " free."}'
info "macOS can take a few minutes to update the numbers in System Settings > Storage."
