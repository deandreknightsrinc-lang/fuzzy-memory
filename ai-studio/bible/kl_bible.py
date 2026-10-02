#!/usr/bin/env python3
"""kl-bible: the Knight Lyfe dramatized audio Bible and cinematic Bible, made on kl-oracle.

For a chapter it writes the dramatized script (the same draft the church website
makes, with the AI double-checking who speaks), records every line with the AI
voice cast (Kokoro voices, free and private), adds a soft music bed, paints the
scenes (FLUX.1-schnell when there's a GPU, or pictures you supply), and renders
the cinematic video with subtitles: 16:9 for YouTube and the church app, and
vertical for Reels, TikTok and Shorts.

The words of Scripture are never changed: the script only says who reads each
part of a verse, and every line is checked against the Bible text.

  kl-bible make kjv John 3            one chapter (audio, scenes, video)
  kl-bible book kjv John              every chapter of a book
  kl-bible shots kjv John 3           shot list for premium AI video tools
  kl-bible index                      rebuild the list of produced chapters

Options: --engine kokoro|flite  --images auto|flux|none|<folder>  --no-ai
         --no-video  --vertical  --script FILE.json  --out DIR
"""
import argparse
import json
import math
import os
import re
import shutil
import subprocess
import sys
import tempfile
import urllib.request
import wave

ROOT = os.environ.get('KL_BIBLE_ROOT', '/opt/knight-keys-src/church/bible')
OUT = os.environ.get('KL_BIBLE_OUT', '/srv/kk-studio/bible')
OLLAMA = os.environ.get('KL_BIBLE_OLLAMA', 'http://127.0.0.1:11434')
MODEL = os.environ.get('KL_BIBLE_MODEL', 'qwen2.5:7b')
RATE = 24000
CAMERAS = ['slow push in', 'slow pan right', 'gentle pull back', 'slow pan left', 'rise up']


def say(*a):
    print(*a, flush=True)


# ---- Text and script ---------------------------------------------------------------------

def draft(version, book, chapter):
    """The website's draft script and scenes (church/bible/tools/script.mjs)."""
    out = subprocess.run(['node', os.path.join(ROOT, 'tools', 'script.mjs'), version, book, str(chapter)], capture_output=True, text=True)
    if out.returncode:
        raise SystemExit(out.stderr.strip() or 'could not read the chapter')
    return json.loads(out.stdout)


def letters(s):
    return re.sub(r'[“”‘’"\s]', '', s or '')


def check_script(verses, lines, cast):
    """Problems with a script (empty = faithful to the text)."""
    problems = []
    by = {}
    for l in lines:
        if l.get('speaker') not in cast:
            problems.append(f"unknown speaker {l.get('speaker')!r} in verse {l.get('verse')}")
        by.setdefault(l.get('verse'), []).append(l.get('text', ''))
    for v in verses:
        if letters(''.join(by.pop(v['n'], []))) != letters(v['text']):
            problems.append(f"verse {v['n']} doesn't match the Bible text")
    problems += [f'verse {n} is not in this chapter' for n in by]
    return problems


def voice_for(line, cast, pools):
    """The Kokoro voice for a line: the same choice as voiceFor in church/js/drama.js."""
    ch = line.get('character')
    if ch and line['speaker'] in pools:
        h = 0
        for c in ch:
            h = (h * 31 + ord(c)) & 0xFFFFFFFF
        pool = pools[line['speaker']]
        return pool[h % len(pool)]
    return cast.get(line['speaker'], cast['narrator'])['voice']


def ollama_json(prompt, system):
    body = json.dumps({'model': MODEL, 'stream': False, 'format': 'json', 'options': {'temperature': 0.2},
                       'messages': [{'role': 'system', 'content': system}, {'role': 'user', 'content': prompt}]}).encode()
    req = urllib.request.Request(f'{OLLAMA}/api/chat', data=body, headers={'Content-Type': 'application/json'})
    with urllib.request.urlopen(req, timeout=600) as r:
        return json.loads(json.loads(r.read())['message']['content'])


SPEAKER_SYSTEM = ('You are the casting director of a dramatized audio Bible. You never change, add or remove any words. '
                  'For each numbered line you decide only who reads it, choosing a speaker id from the cast list '
                  '(use "man" or "woman" plus the character name for people without their own id). '
                  'Narration ("And Jesus said unto her,") is always "narrator". Answer with JSON only.')


def refine_speakers(d):
    """Ask the AI who reads each line (only speakers can change; the text stays)."""
    cast = d['cast']
    listing = '\n'.join(f"{i}. [{l['speaker']}{'/' + l['character'] if l.get('character') else ''}] (v{l['verse']}) {l['text'].strip()}" for i, l in enumerate(d['lines']))
    prompt = (f"{d['bookName']} {d['chapter']}. Cast ids: {', '.join(cast)}.\n"
              'Each line shows its current guess in brackets. Return {"lines": [{"i": 0, "speaker": "...", "character": "..."}, ...]} '
              f'with one entry for every line 0-{len(d["lines"]) - 1}.\n\n{listing}')
    try:
        got = ollama_json(prompt, SPEAKER_SYSTEM).get('lines', [])
    except Exception as e:  # noqa: BLE001 - the draft is fine without the AI
        say(f'  (AI casting skipped: {e})')
        return d['lines']
    lines = [dict(l) for l in d['lines']]
    changed = 0
    for g in got if isinstance(got, list) else []:
        i, sp = g.get('i'), g.get('speaker')
        if not isinstance(i, int) or not 0 <= i < len(lines) or sp not in cast:
            continue
        ch = (g.get('character') or '').strip()[:40] if sp in ('man', 'woman') else ''
        if sp != lines[i]['speaker'] or ch != lines[i].get('character', ''):
            changed += 1
        lines[i]['speaker'] = sp
        if ch:
            lines[i]['character'] = ch
        else:
            lines[i].pop('character', None)
    say(f'  AI casting: {changed} line(s) recast')
    return lines


SCENE_SYSTEM = ('You are the director of a reverent cinematic Bible film for all ages. Split the chapter into 3 to 8 scenes of '
                'consecutive verses. For each scene write one rich, concrete image prompt for a photorealistic film still '
                '(setting, people, light, mood, lens). Rules: never show the face of God the Father (show light, cloud, fire or glory); '
                'show Jesus with dignity as a first-century Middle-Eastern Jewish man; no gore or graphic violence; angels are majestic '
                'and kind; no text in the picture. Answer with JSON only.')


def refine_scenes(d):
    verses = d['verses']
    text = '\n'.join(f"{v['n']}. {v['text']}" for v in verses)
    prompt = (f"{d['bookName']} {d['chapter']}:\n{text}\n\n"
              'Return {"scenes": [{"from": 1, "to": 5, "title": "...", "prompt": "...", "camera": "..."}]} '
              f'covering every verse in order; camera is one of: {", ".join(CAMERAS)}.')
    try:
        scenes = ollama_json(prompt, SCENE_SYSTEM).get('scenes', [])
    except Exception as e:  # noqa: BLE001
        say(f'  (AI scenes skipped: {e})')
        return d['scenes']
    first, last = verses[0]['n'], verses[-1]['n']
    ok = isinstance(scenes, list) and scenes and all(isinstance(s, dict) for s in scenes)
    expect = first
    for s in scenes if ok else []:
        try:
            s['from'], s['to'] = int(s['from']), int(s['to'])
        except (KeyError, TypeError, ValueError):
            ok = False
            break
        if s['from'] != expect or s['to'] < s['from'] or not str(s.get('prompt', '')).strip():
            ok = False
            break
        s['camera'] = s.get('camera') if s.get('camera') in CAMERAS else CAMERAS[0]
        s['title'] = str(s.get('title') or f"Verses {s['from']}-{s['to']}")[:80]
        s['prompt'] = str(s['prompt'])[:900]
        expect = s['to'] + 1
    if not ok or expect != last + 1:
        say('  (AI scenes did not cover the chapter; using the draft scenes)')
        return d['scenes']
    say(f'  AI scenes: {len(scenes)}')
    return scenes


# ---- Voices ------------------------------------------------------------------------------

EFFECTS = {
    'reverb': 'asetrate={r}*0.94,aresample={r},aecho=0.8:0.85:60|120:0.35|0.25,volume=1.1',
    'dark': 'asetrate={r}*0.9,aresample={r},lowpass=f=5000',
    'shimmer': 'chorus=0.6:0.9:50|60:0.3|0.25:0.25|0.4:2|1.3,aecho=0.8:0.7:40:0.2',
    'crowd': 'chorus=0.5:0.9:30|45|65:0.4|0.35|0.3:0.3|0.25|0.35:2|2.3|1.7',
}
FLITE_VOICES = {'af': 'slt', 'bf': 'slt', 'am': 'kal16', 'bm': 'awb'}


class Voices:
    def __init__(self, engine):
        self.engine = engine
        self.pipes = {}
        if engine == 'kokoro':
            try:
                import kokoro  # noqa: F401
            except ImportError:
                raise SystemExit('Kokoro is not installed: run the AI Studio setup again, or use --engine flite.')

    def wav(self, text, voice, path, speed=1.0):
        """One line to a WAV file (24 kHz mono)."""
        if self.engine == 'kokoro':
            import numpy as np
            import soundfile as sf
            from kokoro import KPipeline
            lang = voice[0]  # a = American, b = British
            if lang not in self.pipes:
                self.pipes[lang] = KPipeline(lang_code=lang)
            audio = [np.asarray(a, dtype='float32') for _, _, a in self.pipes[lang](text, voice=voice, speed=speed)]
            sf.write(path, np.concatenate(audio) if audio else np.zeros(RATE // 4, dtype='float32'), RATE, subtype='PCM_16')
        else:
            with tempfile.NamedTemporaryFile('w', suffix='.txt', delete=False) as f:
                f.write(text)
            fv = FLITE_VOICES.get(voice[:2], 'kal16')
            run(['ffmpeg', '-v', 'error', '-y', '-f', 'lavfi', '-i', f'flite=textfile={f.name}:voice={fv}', '-ar', str(RATE), '-ac', '1', path])
            os.unlink(f.name)


def run(cmd):
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode:
        raise SystemExit(f"{cmd[0]} failed: {r.stderr.strip()[-800:]}")
    return r


def read_pcm(path):
    with wave.open(path) as w:
        assert w.getframerate() == RATE and w.getnchannels() == 1 and w.getsampwidth() == 2, path
        return w.readframes(w.getnframes())


def record(lines, cast, voices, work):
    """Every line recorded and joined, with pauses; returns (wav path, timed lines)."""
    pcm = bytearray()
    timed = []
    silence = lambda s: bytes(int(RATE * s) * 2)  # noqa: E731
    pcm += silence(0.6)
    for i, l in enumerate(lines):
        raw = os.path.join(work, f'line{i}.wav')
        voices.wav(l['text'].strip(), l['voice'], raw)
        fx = cast.get(l['speaker'], {}).get('effect')
        if fx in EFFECTS:
            done = os.path.join(work, f'line{i}fx.wav')
            run(['ffmpeg', '-v', 'error', '-y', '-i', raw, '-af', EFFECTS[fx].format(r=RATE), '-ar', str(RATE), '-ac', '1', done])
            raw = done
        start = len(pcm) / 2 / RATE
        pcm += read_pcm(raw)
        end = len(pcm) / 2 / RATE
        timed.append({**{k: l[k] for k in ('verse', 'speaker', 'text') if k in l}, **({'character': l['character']} if l.get('character') else {}), 'start': round(start, 3), 'end': round(end, 3)})
        nxt = lines[i + 1] if i + 1 < len(lines) else None
        pcm += silence(0.18 if nxt and nxt['verse'] == l['verse'] else 0.45)
    pcm += silence(1.2)
    path = os.path.join(work, 'voices.wav')
    with wave.open(path, 'wb') as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(RATE)
        w.writeframes(bytes(pcm))
    return path, timed


def music_bed(seconds, path, key_hz=110.0):
    """A soft, original pad (root, fifth, octave, slowly breathing) to lay under the voices."""
    f = [key_hz, key_hz * 1.5, key_hz * 2, key_hz * 3]
    expr = '+'.join(f'{a}*sin(2*PI*{hz}*t)*(0.75+0.25*sin(2*PI*{0.05 + 0.02 * i}*t))' for i, (hz, a) in enumerate(zip(f, [0.5, 0.3, 0.25, 0.12])))
    run(['ffmpeg', '-v', 'error', '-y', '-f', 'lavfi', '-i', f'aevalsrc={expr}:s={RATE}:d={seconds:.2f}',
         '-af', f'lowpass=f=900,volume=0.25,afade=t=in:d=3,afade=t=out:st={max(0, seconds - 4):.2f}:d=4', '-ac', '1', path])


def mix(voices_wav, seconds, out_mp3, work):
    bed = os.path.join(work, 'bed.wav')
    music_bed(seconds, bed)
    run(['ffmpeg', '-v', 'error', '-y', '-i', voices_wav, '-i', bed, '-filter_complex',
         '[1][0]sidechaincompress=threshold=0.03:ratio=6:attack=20:release=400[duck];'
         '[0][duck]amix=inputs=2:normalize=0,loudnorm=I=-16:TP=-1.5:LRA=11',
         '-ar', '44100', '-ac', '2', '-b:a', '160k', out_mp3])


def duration(path):
    r = run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', path])
    return float(r.stdout.strip())


# ---- Pictures ---------------------------------------------------------------------------

STYLE = 'cinematic, photorealistic biblical epic, ancient Near East setting, natural light, historically grounded clothing and architecture, reverent, film still, no text, no captions'


def paint(scenes, images, out_dir, stem):
    """Scene pictures: a folder you supply (scene-1.jpg, ...), FLUX on the GPU, or none."""
    made = 0
    if images == 'none':
        return 0
    if images not in ('auto', 'flux') and os.path.isdir(images):
        for i, s in enumerate(scenes, 1):
            for ext in ('jpg', 'jpeg', 'png', 'webp'):
                src = os.path.join(images, f'scene-{i}.{ext}')
                if os.path.exists(src):
                    dst = f'{stem}-scene-{i}.{ext}'
                    shutil.copy(src, os.path.join(out_dir, dst))
                    s['image'] = dst
                    made += 1
                    break
        return made
    try:
        import torch
        from diffusers import FluxPipeline
    except ImportError:
        if images == 'flux':
            raise SystemExit('FLUX needs the image tools: run the AI Studio setup with KK_IMAGES=1.')
        say('  (no image tools: the video uses moving color backgrounds)')
        return 0
    if not torch.cuda.is_available() and images == 'auto':
        say('  (no GPU: skipping AI pictures; use --images flux to paint on the CPU, slowly)')
        return 0
    pipe = FluxPipeline.from_pretrained('black-forest-labs/FLUX.1-schnell', torch_dtype=torch.bfloat16)
    pipe.enable_model_cpu_offload()
    for i, s in enumerate(scenes, 1):
        say(f'  painting scene {i}/{len(scenes)}')
        img = pipe(f"{s['prompt']}. {STYLE}", guidance_scale=0.0, num_inference_steps=4, max_sequence_length=256, width=1344, height=768).images[0]
        dst = f'{stem}-scene-{i}.jpg'
        img.save(os.path.join(out_dir, dst), quality=92)
        s['image'] = dst
        made += 1
    return made


# ---- Video ------------------------------------------------------------------------------

def ass_time(t):
    h, rem = divmod(max(0.0, t), 3600)
    m, s = divmod(rem, 60)
    return f'{int(h)}:{int(m):02d}:{s:05.2f}'


def subtitles(timed, cast, path, w, h):
    """Subtitles in pieces that fit the screen, with the speaker's name over their words."""
    size = round(h * (0.045 if w > h else 0.032))
    lines = [
        '[Script Info]', 'ScriptType: v4.00+', f'PlayResX: {w}', f'PlayResY: {h}', 'WrapStyle: 0', '',
        '[V4+ Styles]',
        'Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding',
        f'Style: Words,DejaVu Serif,{size},&H00FFFFFF,&H00FFFFFF,&H00000000,&H64000000,0,0,0,0,100,100,0,0,1,2.5,1.5,2,{round(w * 0.08)},{round(w * 0.08)},{round(h * (0.08 if w > h else 0.16))},1',
        '', '[Events]', 'Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text',
    ]
    limit = 90 if w > h else 60
    for l in timed:
        words = l['text'].strip()
        parts = re.findall(r'[^.!?;:]+[.!?;:]*\s*', words) or [words]
        chunks = []
        for p in parts:
            if chunks and len(chunks[-1]) + len(p) <= limit:
                chunks[-1] += p
            else:
                chunks.append(p)
        total = sum(len(c) for c in chunks) or 1
        t = l['start']
        who = l.get('character') or (cast.get(l['speaker'], {}).get('name') if l['speaker'] != 'narrator' else '')
        for c in chunks:
            d = (l['end'] - l['start']) * len(c) / total
            text = c.strip().replace('{', '(').replace('}', ')').replace('\n', ' ')
            label = f'{{\\fs{round(size * 0.6)}\\c&H27A2C9&\\b1}}{who}\\N{{\\r}}' if who else ''
            lines.append(f'Dialogue: 0,{ass_time(t)},{ass_time(t + d)},Words,,0,0,0,,{label}{text}')
            t += d
    with open(path, 'w', encoding='utf-8') as f:
        f.write('\n'.join(lines) + '\n')


def zoom_expr(camera, frames):
    p = f'(on/{max(frames - 1, 1)})'
    return {
        'slow push in': (f'1+0.12*{p}', 'iw/2-(iw/zoom/2)', 'ih/2-(ih/zoom/2)'),
        'gentle pull back': (f'1.12-0.12*{p}', 'iw/2-(iw/zoom/2)', 'ih/2-(ih/zoom/2)'),
        'slow pan right': ('1.1', f'(iw-iw/zoom)*{p}', 'ih/2-(ih/zoom/2)'),
        'slow pan left': ('1.1', f'(iw-iw/zoom)*(1-{p})', 'ih/2-(ih/zoom/2)'),
        'rise up': ('1.1', 'iw/2-(iw/zoom/2)', f'(ih-ih/zoom)*(1-{p})'),
    }.get(camera, (f'1+0.12*{p}', 'iw/2-(iw/zoom/2)', 'ih/2-(ih/zoom/2)'))


def render(scenes, timed, cast, audio, seconds, out_dir, stem, work, w, h, color='7c3aed', fps=30):
    """The cinematic video: each scene's picture slowly moving, the voices, music and subtitles."""
    clips = []
    starts = []
    for s in scenes:
        mine = [l for l in timed if s['from'] <= l['verse'] <= s['to']]
        starts.append(mine[0]['start'] if mine else 0)
    starts[0] = 0
    for i, s in enumerate(scenes):
        end = starts[i + 1] if i + 1 < len(scenes) else seconds
        dur = max(1.0, end - starts[i])
        frames = math.ceil(dur * fps)
        clip = os.path.join(work, f'{w}x{h}-scene{i}.mp4')
        z, x, y = zoom_expr(s.get('camera'), frames)
        fades = f'format=yuv420p,fade=t=in:d=0.6,fade=t=out:st={max(0, dur - 0.6):.2f}:d=0.6'
        if s.get('image'):
            # The picture slowly moving (zoom/pan from a double-size copy keeps it sharp).
            src = ['-loop', '1', '-framerate', str(fps), '-i', os.path.join(out_dir, s['image'])]
            vf = f"scale={w * 2}:{h * 2}:force_original_aspect_ratio=increase,crop={w * 2}:{h * 2},zoompan=z='{z}':x='{x}':y='{y}':d=1:s={w}x{h}:fps={fps},{fades}"
        else:
            # No picture: slowly drifting church colors (cheap to make, no zoom needed).
            src = ['-f', 'lavfi', '-i', f'gradients=s={w}x{h}:type=radial:c0=0x{color}:c1=0x0b0714:c2=0x4a3a10:c3=0x120a24:n=4:speed=0.003:r={fps}']
            vf = fades
        run(['ffmpeg', '-v', 'error', '-y', *src, '-t', f'{dur:.3f}', '-vf', vf, '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '21', '-an', clip])
        clips.append(clip)
    lst = os.path.join(work, f'{w}x{h}.txt')
    with open(lst, 'w') as f:
        f.writelines(f"file '{c}'\n" for c in clips)
    ass = os.path.join(work, f'{w}x{h}.ass')
    subtitles(timed, cast, ass, w, h)
    name = f'{stem}.mp4' if w > h else f'{stem}-vertical.mp4'
    run(['ffmpeg', '-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', lst, '-i', audio,
         '-vf', f"subtitles={ass}", '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '21', '-pix_fmt', 'yuv420p',
         '-c:a', 'aac', '-b:a', '160k', '-shortest', '-movflags', '+faststart', os.path.join(out_dir, name)])
    return name


# ---- Commands ----------------------------------------------------------------------------

def make(args, version, book, chapter):
    d = draft(version, book, chapter)
    label = f"{d['bookName']} {chapter} ({d['version']})"
    say(f'== {label}')
    cast = d['cast']
    if args.script:
        given = json.load(open(args.script, encoding='utf-8'))
        problems = check_script(d['verses'], given.get('lines', []), cast)
        if problems:
            raise SystemExit(f'The script file is not faithful to the text: {"; ".join(problems[:5])}')
        d['lines'] = given['lines']
        say('  using your script')
    elif not args.no_ai:
        d['lines'] = refine_speakers(d)
    if not args.no_ai:
        d['scenes'] = refine_scenes(d)
    problems = check_script(d['verses'], d['lines'], cast)
    if problems:
        raise SystemExit(f'Script check failed: {"; ".join(problems[:5])}')
    for l in d['lines']:
        l['voice'] = voice_for(l, cast, d['voicePools'])

    out_dir = os.path.join(args.out, d['version'], d['book'])
    os.makedirs(out_dir, exist_ok=True)
    stem = str(chapter)
    with tempfile.TemporaryDirectory() as work:
        say(f"  recording {len(d['lines'])} lines ({args.engine})")
        voices_wav, timed = record(d['lines'], cast, Voices(args.engine), work)
        seconds = len(read_pcm(voices_wav)) / 2 / RATE
        mix(voices_wav, seconds, os.path.join(out_dir, f'{stem}.mp3'), work)
        verses = []
        for v in d['verses']:
            mine = [l for l in timed if l['verse'] == v['n']]
            if mine:
                verses.append({'n': v['n'], 'start': mine[0]['start'], 'end': mine[-1]['end']})
        chapter_json = {'format': 'knight-bible-chapter', 'version': d['version'], 'book': d['book'], 'chapter': chapter,
                        'title': label, 'audio': f'{stem}.mp3', 'seconds': round(seconds, 2), 'voices': args.engine,
                        'lines': timed, 'verses': verses, 'scenes': d['scenes']}
        if not args.no_video:
            n = paint(d['scenes'], args.images, out_dir, stem)
            say(f'  scenes: {len(d["scenes"])}, pictures: {n}')
            audio = os.path.join(out_dir, f'{stem}.mp3')
            chapter_json['video'] = render(d['scenes'], timed, cast, audio, seconds, out_dir, stem, work, 1920, 1080)
            if args.vertical:
                chapter_json['vertical'] = render(d['scenes'], timed, cast, audio, seconds, out_dir, stem, work, 1080, 1920)
        with open(os.path.join(out_dir, f'{stem}.json'), 'w', encoding='utf-8') as f:
            json.dump(chapter_json, f, ensure_ascii=False, indent=1)
    say(f'  done: {out_dir}/{stem}.json ({seconds / 60:.1f} min)')
    update_index(args.out)


def shots(args, version, book, chapter):
    d = draft(version, book, chapter)
    if not args.no_ai:
        d['scenes'] = refine_scenes(d)
    out_dir = os.path.join(args.out, d['version'], d['book'])
    os.makedirs(out_dir, exist_ok=True)
    rows = []
    md = [f"# {d['bookName']} {chapter} ({d['version']}) - shot list", '', f'Style for every shot: {STYLE}.', '']
    for i, s in enumerate(d['scenes'], 1):
        heard = ' / '.join(f"{l.get('character') or d['cast'][l['speaker']]['name']}: {l['text'].strip()}" for l in d['lines'] if s['from'] <= l['verse'] <= s['to'])
        md += [f"## Shot {i} (verses {s['from']}-{s['to']})", '', f"**Prompt:** {s['prompt']}", '', f"**Camera:** {s['camera']}", '', f'**Heard:** {heard}', '']
        rows.append([i, f"{s['from']}-{s['to']}", s['camera'], s['prompt'], heard])
    path = os.path.join(out_dir, f'{chapter}-shot-list.md')
    with open(path, 'w', encoding='utf-8') as f:
        f.write('\n'.join(md))
    import csv
    with open(path.replace('.md', '.csv'), 'w', newline='', encoding='utf-8') as f:
        csv.writer(f).writerows([['shot', 'verses', 'camera', 'prompt', 'audio'], *rows])
    say(f'Shot list: {path} (and .csv). Make each shot in Runway, Kling, Veo or Sora, save them as scene-1.mp4, scene-2.mp4, ...')


def update_index(out):
    """index.json: which chapters are produced, for the church app."""
    have = {}
    for version in sorted(os.listdir(out)) if os.path.isdir(out) else []:
        vdir = os.path.join(out, version)
        if not os.path.isdir(vdir):
            continue
        for book in sorted(os.listdir(vdir)):
            chs = sorted(int(f[:-5]) for f in os.listdir(os.path.join(vdir, book)) if re.fullmatch(r'\d+\.json', f))
            if chs:
                have.setdefault(version, {})[book] = chs
    with open(os.path.join(out, 'index.json'), 'w') as f:
        json.dump({'format': 'knight-bible-media', 'chapters': have}, f)


def main(argv=None):
    p = argparse.ArgumentParser(prog='kl-bible', description='Make the dramatized audio Bible and cinematic Bible.')
    p.add_argument('command', choices=['make', 'book', 'shots', 'index'])
    p.add_argument('version', nargs='?')
    p.add_argument('book', nargs='?')
    p.add_argument('chapter', nargs='?', type=int)
    p.add_argument('--engine', default='kokoro', choices=['kokoro', 'flite'])
    p.add_argument('--images', default='auto', help='auto, flux, none, or a folder with scene-1.jpg, scene-2.jpg, ...')
    p.add_argument('--no-ai', action='store_true', help='skip the AI casting and scene writing (use the drafts)')
    p.add_argument('--no-video', action='store_true')
    p.add_argument('--vertical', action='store_true', help='also make a 9:16 video for Reels, TikTok and Shorts')
    p.add_argument('--script', help='a script saved from the Bible page (Production > Script for kl-oracle)')
    p.add_argument('--out', default=OUT)
    a = p.parse_args(argv)
    if a.command == 'index':
        return update_index(a.out)
    if not a.version or not a.book:
        p.error('give a version and a book, e.g. kl-bible make kjv John 3')
    if a.command == 'book':
        books = json.load(open(os.path.join(ROOT, 'books.json')))['books']
        b = next((x for x in books if a.book.lower() in (x['id'].lower(), x['name'].lower())), None)
        if not b:
            raise SystemExit(f'unknown book {a.book}')
        for c in range(1, b['chapters'] + 1):
            make(a, a.version, b['id'], c)
        return None
    if not a.chapter:
        p.error('give a chapter, e.g. kl-bible make kjv John 3')
    return (make if a.command == 'make' else shots)(a, a.version, a.book, a.chapter)


if __name__ == '__main__':
    sys.exit(main())
