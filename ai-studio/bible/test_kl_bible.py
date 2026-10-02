"""Tests for kl-bible (python3 -m unittest discover ai-studio/bible). No AI, voices or ffmpeg needed."""
import json
import os
import shutil
import subprocess
import sys
import tempfile
import unittest
from unittest import mock

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
os.environ.setdefault('KL_BIBLE_ROOT', os.path.join(HERE, '..', '..', 'church', 'bible'))
import kl_bible as k  # noqa: E402

HAVE_NODE = shutil.which('node') is not None


@unittest.skipUnless(HAVE_NODE, 'needs node')
class Draft(unittest.TestCase):
    def setUp(self):
        k.ROOT = os.environ['KL_BIBLE_ROOT']
        self.d = k.draft('kjv', 'Gen', 1)

    def test_draft_is_faithful_and_cast(self):
        d = self.d
        self.assertEqual(d['bookName'], 'Genesis')
        self.assertEqual(len(d['verses']), 31)
        self.assertEqual(k.check_script(d['verses'], d['lines'], d['cast']), [])
        god = [l for l in d['lines'] if l['speaker'] == 'god']
        self.assertTrue(god and god[0]['text'].startswith('Let there be light'))
        self.assertTrue(all(l['voice'] for l in d['lines']))

    def test_voices_match_the_website(self):
        d = self.d
        # Same picks as voiceFor in church/js/drama.js (checked in knight-keys/test/bible.test.js).
        self.assertEqual(k.voice_for({'speaker': 'woman', 'character': 'Rebekah'}, d['cast'], d['voicePools']), 'bf_lily')
        self.assertEqual(k.voice_for({'speaker': 'man', 'character': 'Zechariah'}, d['cast'], d['voicePools']), 'bm_lewis')
        self.assertEqual(k.voice_for({'speaker': 'jesus'}, d['cast'], d['voicePools']), d['cast']['jesus']['voice'])

    def test_ai_casting_can_only_change_speakers(self):
        d = self.d
        answer = {'lines': [{'i': 0, 'speaker': 'god'}, {'i': 1, 'speaker': 'pharaoh'}, {'i': 999, 'speaker': 'god'}, {'i': 'x'},
                            {'i': 2, 'speaker': 'woman', 'character': 'Eve', 'text': 'CHANGED WORDS'}]}
        with mock.patch.object(k, 'ollama_json', return_value=answer):
            lines = k.refine_speakers(d)
        self.assertEqual(lines[0]['speaker'], 'god')
        self.assertEqual(lines[1]['speaker'], d['lines'][1]['speaker'], 'unknown speakers are ignored')
        self.assertEqual(lines[2]['character'], 'Eve')
        self.assertEqual([l['text'] for l in lines], [l['text'] for l in d['lines']], 'the words never change')
        with mock.patch.object(k, 'ollama_json', side_effect=OSError('no server')):
            self.assertEqual(k.refine_speakers(d), d['lines'], 'without the AI the draft stays')

    def test_ai_scenes_must_cover_the_chapter(self):
        d = self.d
        good = {'scenes': [{'from': 1, 'to': 5, 'title': 'Light', 'prompt': 'Light over dark waters', 'camera': 'slow push in'},
                           {'from': 6, 'to': 31, 'prompt': 'The garden', 'camera': 'zoom wildly'}]}
        with mock.patch.object(k, 'ollama_json', return_value=good):
            scenes = k.refine_scenes(d)
        self.assertEqual(len(scenes), 2)
        self.assertEqual(scenes[1]['camera'], 'slow push in', 'unknown camera moves fall back')
        self.assertEqual(scenes[1]['title'], 'Verses 6-31')
        gap = {'scenes': [{'from': 1, 'to': 5, 'prompt': 'a'}, {'from': 9, 'to': 31, 'prompt': 'b'}]}
        with mock.patch.object(k, 'ollama_json', return_value=gap):
            self.assertEqual(k.refine_scenes(d), d['scenes'], 'a gap means the draft scenes are used')


class Pieces(unittest.TestCase):
    def test_check_script(self):
        verses = [{'n': 1, 'text': 'And God said, “Let there be light.”'}]
        cast = {'narrator': {}, 'god': {}}
        self.assertEqual(k.check_script(verses, [{'verse': 1, 'speaker': 'narrator', 'text': 'And God said, '}, {'verse': 1, 'speaker': 'god', 'text': 'Let there be light.'}], cast), [])
        self.assertTrue(k.check_script(verses, [{'verse': 1, 'speaker': 'narrator', 'text': 'And God said, Let there be lights.'}], cast))
        self.assertTrue(k.check_script(verses, [{'verse': 1, 'speaker': 'moses', 'text': verses[0]['text']}], cast))

    def test_subtitles(self):
        timed = [{'verse': 1, 'speaker': 'narrator', 'text': 'In the beginning {God} created the heaven and the earth.', 'start': 0.5, 'end': 3},
                 {'verse': 3, 'speaker': 'god', 'text': 'Let there be light: and there was light.', 'start': 4, 'end': 6}]
        with tempfile.TemporaryDirectory() as d:
            p = os.path.join(d, 'a.ass')
            k.subtitles(timed, {'narrator': {'name': 'Narrator'}, 'god': {'name': 'God (the LORD)'}}, p, 1920, 1080)
            ass = open(p, encoding='utf-8').read()
        self.assertIn('PlayResX: 1920', ass)
        self.assertIn('God (the LORD)', ass)
        self.assertNotIn('{God}', ass, 'braces in the text cannot become subtitle commands')
        self.assertIn('Dialogue: 0,0:00:00.50,', ass)
        self.assertEqual(k.ass_time(3725.5), '1:02:05.50')

    def test_camera_moves(self):
        for cam in k.CAMERAS + ['unknown']:
            z, x, y = k.zoom_expr(cam, 90)
            self.assertTrue(z and x and y)

    def test_index(self):
        with tempfile.TemporaryDirectory() as d:
            os.makedirs(os.path.join(d, 'kjv', 'Gen'))
            for f in ('1.json', '2.json', '1.mp3', '10.json', '1-shot-list.md'):
                open(os.path.join(d, 'kjv', 'Gen', f), 'w').write('{}')
            k.update_index(d)
            idx = json.load(open(os.path.join(d, 'index.json')))
        self.assertEqual(idx['chapters'], {'kjv': {'Gen': [1, 2, 10]}})


if __name__ == '__main__':
    unittest.main()
