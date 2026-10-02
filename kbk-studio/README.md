# KBK Studio

Knight Lyfe's sampler and audio toolbox in the browser, in the Knight Lyfe Ultimate look. It plays from a MIDI keyboard or pad controller.

| Tab | What it does |
|---|---|
| **Pads** | 16 velocity-sensitive sample pads (MPC layout: pad 1 bottom-left). Load a pad from a **link**, a file, the library, or by dragging a file *or a link from another tab* onto it. Per pad: start/end trim, level, tune (±24 semitones), pan, one-shot / hold / loop, reverse, choke groups (open/closed hats), MIDI learn. The kit is saved on this computer and comes back after a reload. |
| **URL Reader** | Paste a link, get audio: play it, select a part, put it on a pad, **chop it onto the pads** (by hits or 4/8/16 equal slices), save it to the library, split stems, or download it as WAV, AIFF, MP3 (or FLAC/M4A/OGG/Opus with the helper). |
| **Stem Split** | Vocals, drums, bass and other (or vocals + instrumental). **Quick** runs in the browser with no setup. **Pro** uses the Demucs AI model on the KBK helper: `htdemucs`, the fine-tuned `htdemucs_ft`, or `htdemucs_6s` (adds guitar and piano). |
| **Converter** | Drop any number of audio or **video** files; out come WAV 16/24/32-float, AIFF 16/24, MP3 128/192/320 (plus FLAC, M4A, OGG, Opus with the helper), at the sample rate and channels you choose, normalized and trimmed if you like. |
| **Library** | Everything read, split, converted or saved, kept on this computer. Play, put on a pad, open in the reader, download. |

## Your keyboard

Plug the keyboard in (USB) and open the studio in **Chrome or Edge** (Safari has no Web MIDI). It's picked up by itself, even when plugged in after the page is open; the **MIDI** chip at the top shows its name and flashes when you play. Click it to choose a keyboard, see the last note received, or rescan.

- **Pads** mode: 16 keys from the pad-1 note play pads 1–16. Pad controllers start at C1 (36); on a keyboard, click **Learn from key** and press the key you want for pad 1. **Learn note** on a pad assigns any single key or pad to it.
- **Keys** mode: the whole keyboard plays the selected pad in pitch, like a sampler instrument. C3 (middle C, 60) plays it as recorded.
- **Split** mode: pads on the lowest 16 keys, the selected pad in pitch on every key above.
- Velocity, sustain pedal (holds Hold/Loop pads), pitch bend (±2 semitones), volume knob (CC 7 = master) all work.
- No keyboard? Click the pads, or use the computer keys `1 2 3 4 / Q W E R / A S D F / Z X C V`. Space stops everything.

MIDI only works on secure pages: the GitHub Pages site (https) or `http://localhost:8765` from the helper. A page opened as `http://192.168.x.x` can't use MIDI.

## The KBK helper (optional)

A small program for the Mac or the studio server for the jobs a browser can't do: links to YouTube, SoundCloud, TikTok, Instagram, Bandcamp, Google Drive, or any site that blocks reading; Demucs stems; FLAC/M4A/OGG/Opus files; formats the browser can't open.

```bash
cd fuzzy-memory/kbk-studio/server
bash setup-helper.sh          # once: ffmpeg, yt-dlp, Demucs (Homebrew on Mac, apt on Linux)
bash start-helper.sh          # then open http://localhost:8765
```

The website finds a helper running on the same computer (`http://localhost:8765`) by itself; the **Helper** chip turns green. To run it on the Proxmox server for the whole network, `bash start-helper.sh --host 0.0.0.0` and open `http://<server-ip>:8765` there. That address is http, so the website can't use it and MIDI won't work on it; use it for stems and conversions, or put it behind the HTTPS Caddy from AI Studio.

Only pull audio you own or have the rights to use.

## Gap analysis: why "paste a URL, load it into a pad" stopped working

The original KBK Studio lives on the Mac (`~/kbk-system`), outside this repository, so its code couldn't be inspected here. These are the failures that break URL-to-pad loading in a browser sampler, and what KBK Studio does about each one. When the old code is in the repo, compare it against this list.

| # | Failure | What you see | What KBK Studio does |
|---|---|---|---|
| 1 | **CORS**: most sites don't let other sites read their files, so `fetch()` throws | Nothing loads, or "Failed to fetch" | Detects it and goes through the helper, which has no CORS limits. Says so in plain words when the helper is off |
| 2 | **Share links are pages**: Dropbox `?dl=0`, Google Drive `/view`, GitHub `/blob/`, OneDrive | Decode error, or silence | Rewrites them to the direct file (`url-tools.js`, tested) |
| 3 | **A "download" returns HTML** (login wall, cookie page, virus-scan page) | "Unable to decode audio data" | Sniffs the first bytes; HTML never reaches the decoder. Retries through the helper |
| 4 | **Video and music sites** (YouTube, SoundCloud, TikTok…) are pages, not files | Never worked in a browser alone | The helper pulls the audio with yt-dlp |
| 5 | **Mixed content**: an `http://` link or helper from the `https://` site | Blocked silently | Detected; uses the helper on localhost (allowed) or explains the fix |
| 6 | **Audio starts suspended** until a click/tap/key (browser autoplay rules) | Pad loads but plays nothing | Starts audio on the first click or key; shows a "Click to start audio" overlay if a keyboard is played first |
| 7 | **`decodeAudioData` detaches the buffer**, so a second decode attempt gets an empty buffer | Works once, then fails | Decodes a copy; our own WAV reader and the helper's ffmpeg are fallbacks |
| 8 | **Format the browser can't decode** (some AIFF/ALAC/WMA/24-bit files) | Decode error | Falls back to the built-in WAV reader, then the helper (ffmpeg) |
| 9 | **Model or service drift** (the Engine Room outage: retired IDs, revoked tokens) | Silent failure | Nothing here depends on an AI model or API key; the in-browser parts work offline |
| 10 | **DRM services** (Spotify, Apple Music, Tidal) | Never possible | Refused up front with an explanation |
| 11 | **Keyboard plugged in after the page loaded** | Keyboard does nothing until reload | Listens for MIDI connect/disconnect and attaches new keyboards live |

## Files

- `index.html`, `styles.css`: the page and the look
- `js/app.js`: the interface; `js/engine.js`: pad playback (Web Audio); `js/store.js`: saved kit and library (IndexedDB)
- `js/url-tools.js`: link rewriting and checks; `js/midi-map.js`: keyboard → pad mapping; `js/audio-utils.js`: WAV/AIFF/MP3 encoders, trim, chop, onsets
- `js/stems.js` + `js/stems-worker.js`: the Quick stem split (STFT masking: harmonic/percussive separation for drums, low band for bass, center-channel extraction for vocals)
- `js/helper.js` + `server/kbk_server.py`: the helper and its client
- `vendor/lamejs`: MP3 encoder (LGPL)

## Tests

```bash
cd kbk-studio && npm test                                   # encoders, links, MIDI mapping, stems
python3 -m unittest discover -s kbk-studio/server            # the helper (uses ffmpeg if installed)
```

Run locally with `npm start` (http://localhost:5174) or through the helper.
