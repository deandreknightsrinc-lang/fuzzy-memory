#!/bin/bash
# Sorts sounds into the Knight Lyfe Sound Library by their names.
#
#   bash organize-samples.sh                      sort the library's Inbox
#   bash organize-samples.sh "/path/to/Sample Pack"   sort another folder (copies)
#   bash organize-samples.sh --pack "/path/to/Pack Name"   install a sound pack:
#                                                files keep the pack's name as a subfolder
#                                                (Drums/Kicks/Pack Name/...), and files
#                                                already installed are skipped
#   options:  --move      move instead of copy
#             --dry-run   only show what would happen
#
# "Big Kick 01.wav" goes to Drums/Kicks, "808 Bass C.wav" to Bass/808 Bass,
# "Choir Ooh.wav" to Choir & Vocals/Choir, and so on. Nothing is overwritten:
# a file that's already there gets a number added to its name.

set -u
CONF="$HOME/.knightlyfe-library"
SRC=""
MOVE=0
DRY=0
PACK=0
for a in "$@"; do
    case "$a" in
        --move) MOVE=1 ;;
        --dry-run) DRY=1 ;;
        --pack) PACK=1 ;;
        *) SRC="$a" ;;
    esac
done

[[ -f "$CONF" ]] || { echo "Run setup-library.sh first to create the library."; exit 1; }
ROOT="$(cat "$CONF")"
[[ -d "$ROOT" ]] || { echo "The library isn't there: $ROOT (is the drive connected?)"; exit 1; }
INBOX="$ROOT/Inbox (drop new sounds here)"
if [[ -z "$SRC" ]]; then
    SRC="$INBOX"
    MOVE=1 # sorting the inbox empties it
fi
[[ -d "$SRC" ]] || { echo "No folder: $SRC"; exit 1; }
SRC="${SRC%/}"
PACK_NAME="$(basename "$SRC")"

# Where a file belongs, from its name (and its folder's name).
category() {
    local n
    n="$(printf '%s' "$1" | tr '[:upper:]' '[:lower:]')"
    case "$n" in
        *.mid|*.midi)
            case "$n" in
                *drum*|*beat*|*groove*) echo "MIDI/Drum Grooves" ;;
                *chord*|*prog*) echo "MIDI/Chord Progressions" ;;
                *) echo "MIDI/Melodies" ;;
            esac
            return ;;
    esac
    case "$n" in
        *808*bass*|*bass*808*|*sub*bass*) echo "Bass/808 Bass" ;;
        *drum*loop*|*loop*drum*|*beat*loop*|*top*loop*|*perc*loop*) echo "Drums/Drum Loops" ;;
        *kick*|*bassdrum*|*"bass drum"*|*bd_*|*_bd*) echo "Drums/Kicks" ;;
        *snare*|*snr*|*rimshot*|*"rim shot"*) echo "Drums/Snares" ;;
        *clap*|*snap*) echo "Drums/Claps & Snaps" ;;
        *hihat*|*hi-hat*|*"hi hat"*|*openhat*|*closedhat*|*" hat"*|*_hat*|*-hat*|*/hat*|hat*|*hh_*|*_hh*) echo "Drums/Hi-Hats" ;;
        *crash*|*ride*|*cymbal*|*splash*|*china*) echo "Drums/Cymbals" ;;
        *" tom"*|*_tom*|*-tom*|*/tom*|tom*|*floortom*|*hitom*|*lowtom*) echo "Drums/Toms" ;;
        *808*) echo "Drums/808s" ;;
        *perc*|*shaker*|*tamb*|*conga*|*bongo*|*cowbell*|*clave*|*block*|*triangle*) echo "Drums/Percussion" ;;
        *choir*|*ooh*|*aah*) echo "Choir & Vocals/Choir" ;;
        *acapella*|*acappella*|*"a cappella"*) echo "Choir & Vocals/Acapellas" ;;
        *adlib*|*ad-lib*|*"ad lib"*) echo "Choir & Vocals/Ad-libs" ;;
        *vox*|*vocal*|*chop*) echo "Choir & Vocals/Vocal Chops" ;;
        *riser*|*sweep*|*uplift*|*build*) echo "FX/Risers & Sweeps" ;;
        *impact*|*boom*|*slam*|*downlift*) echo "FX/Impacts" ;;
        *transition*|*whoosh*|*reverse*|*rev_*) echo "FX/Transitions" ;;
        *ambien*|*texture*|*atmos*|*drone*|*noise*) echo "FX/Ambience & Textures" ;;
        *fx*|*sfx*) echo "FX/Transitions" ;;
        *organ*|*hammond*|*b3*|*leslie*) echo "Keys/Organ" ;;
        *rhodes*|*wurli*|*"e piano"*|*epiano*|*e-piano*|*"electric piano"*) echo "Keys/Electric Piano" ;;
        *piano*|*grand*|*upright*) echo "Keys/Piano" ;;
        *pad*) echo "Synths/Pads" ;;
        *lead*) echo "Synths/Leads" ;;
        *pluck*) echo "Synths/Plucks" ;;
        *arp*) echo "Synths/Arps" ;;
        *bass*) echo "Bass/Synth Bass" ;;
        *guitar*|*gtr*) echo "Guitars" ;;
        *string*|*violin*|*viola*|*cello*|*brass*|*horn*|*trumpet*|*trombone*|*sax*) echo "Strings & Brass" ;;
        *synth*|*keys*) echo "Keys/Synth Keys" ;;
        *loop*|*bpm*) echo "Loops" ;;
        *) echo "Inbox (drop new sounds here)/Unsorted" ;;
    esac
}

moved=0
skipped=0
unsorted=0
summary=""
while IFS= read -r -d '' f; do
    rel="${f#"$SRC"/}"
    case "$rel" in "Unsorted/"*) [[ "$SRC" == "$INBOX" ]] && continue ;; esac
    dest_dir="$ROOT/$(category "$rel")"
    [[ $PACK -eq 1 ]] && dest_dir="$dest_dir/$PACK_NAME"
    base="$(basename "$f")"
    dest="$dest_dir/$base"
    if [[ "$f" == "$dest" ]]; then skipped=$((skipped + 1)); continue; fi
    if [[ $PACK -eq 1 && -e "$dest" ]]; then skipped=$((skipped + 1)); continue; fi # already installed
    i=2
    while [[ -e "$dest" ]]; do
        dest="$dest_dir/${base%.*} ($i).${base##*.}"
        i=$((i + 1))
    done
    if [[ $DRY -eq 1 ]]; then
        echo "  $rel  ->  ${dest_dir#"$ROOT"/}/"
    else
        mkdir -p "$dest_dir"
        if [[ $MOVE -eq 1 ]]; then mv "$f" "$dest"; else cp -p "$f" "$dest"; fi
    fi
    moved=$((moved + 1))
    summary="$summary${dest_dir#"$ROOT"/}"$'\n'
    case "$dest_dir" in *"/Unsorted") unsorted=$((unsorted + 1)) ;; esac
done < <(find "$SRC" -type f \( -iname '*.wav' -o -iname '*.aif' -o -iname '*.aiff' -o -iname '*.mp3' -o -iname '*.flac' \
    -o -iname '*.m4a' -o -iname '*.caf' -o -iname '*.ogg' -o -iname '*.mid' -o -iname '*.midi' \) -print0)

verb=$([[ $DRY -eq 1 ]] && echo "Would sort" || ([[ $MOVE -eq 1 ]] && echo "Moved" || echo "Copied"))
echo
echo "$verb $moved file(s):"
printf '%s' "$summary" | sort | uniq -c | sort -rn | sed 's/^/  /'
[[ $skipped -gt 0 ]] && echo "  ($skipped already in place)"
[[ $unsorted -gt 0 && $DRY -eq 0 ]] && echo "$unsorted file(s) couldn't be placed by name: they're in Inbox/Unsorted. Rename them (add 'kick', 'pad', 'choir'...) and run this again."
exit 0
