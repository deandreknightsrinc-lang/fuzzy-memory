#!/usr/bin/env bash
# Installs what the KBK helper uses: ffmpeg, yt-dlp and Demucs (stems).
# Mac (Homebrew) or Debian/Ubuntu (the Proxmox kl-oracle container). Safe to run again.
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
venv="${KBK_VENV:-$HOME/.kbk-helper}"

say() { printf '\033[1;33m==>\033[0m %s\n' "$*"; }

if [[ "$(uname)" == "Darwin" ]]; then
  if ! command -v brew >/dev/null; then
    echo "Install Homebrew first: https://brew.sh" >&2; exit 1
  fi
  say "ffmpeg and yt-dlp (Homebrew)"
  brew install ffmpeg yt-dlp python@3.11 >/dev/null
  py="$(brew --prefix python@3.11)/bin/python3.11"
else
  say "ffmpeg and Python (apt)"
  sudo_cmd=""; [[ $EUID -ne 0 ]] && sudo_cmd="sudo"
  $sudo_cmd apt-get update -qq
  $sudo_cmd apt-get install -y -qq ffmpeg python3 python3-venv >/dev/null
  py="python3"
fi

say "Python tools in $venv (yt-dlp, Demucs: the first time downloads PyTorch, ~2 GB)"
"$py" -m venv "$venv"
"$venv/bin/pip" install -q --upgrade pip
"$venv/bin/pip" install -q --upgrade yt-dlp demucs soundfile
# torchaudio 2.9+ saves through torchcodec, which Demucs doesn't use yet.
"$venv/bin/pip" install -q "torchaudio<2.9" >/dev/null 2>&1 || true

cat > "$here/start-helper.sh" <<RUN
#!/usr/bin/env bash
# Starts the KBK helper. Add --host 0.0.0.0 to share it on your network.
export PATH="$venv/bin:\$PATH"
exec "$venv/bin/python" "$here/kbk_server.py" "\$@"
RUN
chmod +x "$here/start-helper.sh"

say "Done. Start it with:  bash $here/start-helper.sh"
say "Then open http://localhost:8765 (or keep using the website; it finds the helper)."
