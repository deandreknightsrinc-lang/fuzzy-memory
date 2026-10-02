# Knight Lyfe AI Studio

Local AI helpers for the studio, running on your own server (the `kl-oracle`
container on Proxmox). Nothing is sent to the cloud.

## Install

On the Proxmox host shell:

```
pct enter 112
bash <(curl -fsSL https://raw.githubusercontent.com/deandreknightsrinc-lang/fuzzy-memory/main/ai-studio/setup.sh)
```

It needs about 25 GB free. If the container is too small, on the Proxmox host
run `pct resize 112 rootfs +60G` first. Running it again is safe.

## What you get

| | |
|---|---|
| **Agents** | `kk-mix` (mix & mastering engineer), `kk-sound` (sound designer for Logic's Alchemy, ES2, Sculpture…), `kk-producer` (songs, chords, grooves, practice plans) |
| **Chat page** | Open WebUI at `http://<kl-oracle ip>:8080`, pick an agent at the top |
| **kk-stems** | Splits a song into vocals, drums, bass and other (Demucs) |
| **kk-master** | Masters a mix to match a reference song you like (Matchering) |
| **kk-lyrics** | Writes out the lyrics of a song (Whisper) |
| **Ask the teacher** | Knight Keys and the AI over HTTPS at `https://<ip>:8443` (Caddy with its own certificate; `/ollama` passes to Ollama). The Knight Lyfe teacher characters answer students live from the Lessons window. Trust the certificate on the Mac once: `http://<ip>:8089/root.crt` |
| **kk-sheet** | Reads printed sheet music (PDF, PNG, JPG) with [Audiveris](https://github.com/Audiveris/audiveris): writes a MusicXML score (`.mxl`) and a MIDI file. Open either in Knight Keys (📜 Score > Open score) |
| **kl-bible** | The dramatized audio Bible and cinematic Bible for the church app (`church/bible.html`). `kl-bible make kjv John 3 --vertical` writes the chapter's script (the AI only decides who reads each line; every line is checked word for word against the Bible text), records it with an AI voice cast ([Kokoro](https://github.com/hexgrad/kokoro) voices: narrator, God, Jesus, Moses, Mary, ... characters keep one voice), lays a soft original music bed under it, paints the scenes ([FLUX.1-schnell](https://huggingface.co/black-forest-labs/FLUX.1-schnell) with `KK_IMAGES=1` and a GPU, or your own pictures with `--images folder`), and renders 16:9 and vertical (Reels, TikTok, Shorts) videos with subtitles. `kl-bible book bsb Ruth` does a whole book; `kl-bible shots kjv Gen 1` writes a shot list for premium AI video tools (Runway, Kling, Veo). Results go to the studio folder (`bible/`) and `https://<ip>:8443/bible-media`, where the church's Bible page plays them. On 4 CPU cores a chapter takes about as long as it runs (audio in about a minute). |
| **Studio folder** | `smb://<ip>/studio` in Finder (Go > Connect to Server). Drop songs in `inbox/stems`, `inbox/master` or `inbox/lyrics`, or sheet music in `inbox/sheet`, and the results appear in `outbox/`. The password is in `/root/kk-studio-credentials.txt`. |

The models run on the CPU, so a full song takes a few minutes to split or
master and chat answers take a few seconds to start.

Choose other models with `KK_MODELS="llama3.2:3b qwen2.5:14b" bash setup.sh`
(the last one is used for the agents).
