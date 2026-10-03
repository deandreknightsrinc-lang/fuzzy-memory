#!/usr/bin/env bash
# Installs what the KBK helper uses into ~/.kbk-helper, without Homebrew
# (Homebrew no longer has ready-made packages for Intel Macs):
#   yt-dlp          reads YouTube, SoundCloud, TikTok... links (official build)
#   ffmpeg/ffprobe  converts formats (static build, MP3/OGG/Opus/FLAC/AAC)
#   Demucs          AI stems, only with --stems (downloads ~2 GB of PyTorch)
# Works on Intel and Apple Silicon Macs, and on Linux (apt). Safe to run again;
# run it again to update yt-dlp when YouTube links stop working.
#
#   bash setup-helper.sh            # yt-dlp + ffmpeg (about 90 MB)
#   bash setup-helper.sh --stems    # also Demucs for Pro stems
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
home="${KBK_HOME:-$HOME/.kbk-helper}"
bin="$home/bin"
stems=0
[[ "${1:-}" == "--stems" ]] && stems=1

say() { printf '\033[1;33m==>\033[0m %s\n' "$*"; }
ok() { printf '  \033[32m✓\033[0m %s\n' "$*"; }
die() { printf '\033[31m%s\033[0m\n' "$*" >&2; exit 1; }

mkdir -p "$bin"
os="$(uname -s)"
arch="$(uname -m)"
FFMPEG_TAG="b6.1.1"   # github.com/eugeneware/ffmpeg-static (macOS builds by tessus/evermeet)

fetch() { # url dest
  curl -fL --retry 3 --progress-bar -o "$2.part" "$1" && mv "$2.part" "$2"
}

if [[ "$os" == "Darwin" ]]; then
  case "$arch" in
    x86_64) farch="x64" ;;
    arm64) farch="arm64" ;;
    *) die "Unknown Mac type: $arch" ;;
  esac
  echo "Mac: $(sw_vers -productVersion) on $([[ $arch == arm64 ]] && echo 'Apple Silicon' || echo 'Intel')"

  say "yt-dlp"
  fetch "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_macos" "$bin/yt-dlp"
  chmod +x "$bin/yt-dlp"
  ok "yt-dlp $("$bin/yt-dlp" --version)"

  for tool in ffmpeg ffprobe; do
    if [[ -x "$bin/$tool" ]] && "$bin/$tool" -version >/dev/null 2>&1; then
      ok "$tool already installed"
      continue
    fi
    say "$tool"
    fetch "https://github.com/eugeneware/ffmpeg-static/releases/download/$FFMPEG_TAG/$tool-darwin-$farch.gz" "$bin/$tool.gz"
    gunzip -f "$bin/$tool.gz"
    chmod +x "$bin/$tool"
    ok "$("$bin/$tool" -version | head -1 | cut -d' ' -f1-3)"
  done
  xattr -cr "$bin" 2>/dev/null || true

  # Python: the helper only needs the standard library (3.9+).
  py=""
  for c in python3.12 python3.11 python3.10 python3 /usr/bin/python3; do
    if command -v "$c" >/dev/null 2>&1 && "$c" -c 'import sys; sys.exit(0 if (3, 9) <= sys.version_info[:2] < (3, 13) else 1)' 2>/dev/null; then
      py="$(command -v "$c")"; break
    fi
  done
  if [[ -z "$py" ]]; then
    die "No Python 3.9-3.12 found. Run: xcode-select --install   (it adds python3), then run this again."
  fi
  ok "Python $("$py" -c 'import platform; print(platform.python_version())') ($py)"
else
  say "ffmpeg, yt-dlp and Python (apt)"
  sudo_cmd=""; [[ $EUID -ne 0 ]] && sudo_cmd="sudo"
  $sudo_cmd apt-get update -qq
  $sudo_cmd apt-get install -y -qq ffmpeg python3 python3-venv curl >/dev/null
  fetch "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp" "$bin/yt-dlp"
  chmod +x "$bin/yt-dlp"
  ok "yt-dlp $("$bin/yt-dlp" --version)"
  py="$(command -v python3)"
fi

if [[ $stems == 1 ]]; then
  say "Demucs for Pro stems in $home/venv (downloads PyTorch, ~2 GB; takes a while)"
  "$py" -m venv "$home/venv"
  "$home/venv/bin/pip" install -q --upgrade pip
  if [[ "$os" == "Darwin" && "$arch" == "x86_64" ]]; then
    # PyTorch's last Intel Mac release is 2.2.2, which needs NumPy 1.x.
    "$home/venv/bin/pip" install -q "torch==2.2.2" "torchaudio==2.2.2" "numpy<2"
  else
    # torchaudio 2.9+ saves through torchcodec, which Demucs doesn't use yet.
    "$home/venv/bin/pip" install -q torch "torchaudio<2.9"
  fi
  "$home/venv/bin/pip" install -q demucs soundfile
  ok "Demucs $("$home/venv/bin/python" -c 'import demucs; print(demucs.__version__)')"
  run_py="$home/venv/bin/python"
else
  run_py="$py"
  echo "  (Pro stems skipped. Add --stems to install Demucs, or use kk-stems on the studio server.)"
fi

cat > "$here/start-helper.sh" <<RUN
#!/usr/bin/env bash
# Starts the KBK helper. Add --host 0.0.0.0 to share it on your network.
export PATH="$bin:$home/venv/bin:\$PATH"
"$bin/yt-dlp" -U >/dev/null 2>&1 || true   # YouTube changes often; keep yt-dlp current
exec "$run_py" "$here/kbk_server.py" "\$@"
RUN
chmod +x "$here/start-helper.sh"

echo
say "Done. Start it with:  bash $here/start-helper.sh"
say "Then open http://localhost:8765 in Chrome (or keep using the website; it finds the helper)."
