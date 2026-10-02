import test from 'node:test';
import assert from 'node:assert/strict';
import { SONGS } from '../js/songs.js';
import { TEACHERS } from '../js/teachers.js';
import { SEGMENT_TYPES, newService, validateService, stageFrame, invitePost, hostScript, loadServices, saveServices } from '../js/church.js';

test('the Sunday template is a complete, valid service', () => {
  const svc = newService();
  assert.deepEqual(validateService(svc), []);
  assert.equal(svc.church.name, 'BAC Ministries');
  assert.ok(svc.poweredBy);
  for (const s of svc.segments) assert.ok(SEGMENT_TYPES[s.type], s.type);
  for (const s of svc.segments.filter((x) => x.type === 'song')) assert.ok(SONGS.some((x) => `lib:${x.id}` === s.song), `${s.song} is in the library`);
  assert.ok(svc.segments.find((s) => s.type === 'scripture').reference.includes('KJV'), 'public-domain scripture');
});

test('validation', () => {
  const svc = newService('Grace Chapel');
  svc.segments.push({ type: 'song', title: 'x' }, { type: 'video', title: 'v' }, { type: 'dance' });
  const e = validateService(svc);
  assert.ok(e.some((x) => /pick a song/.test(x)));
  assert.ok(e.some((x) => /video link/.test(x)));
  assert.ok(e.some((x) => /unknown kind "dance"/.test(x)));
  assert.deepEqual(validateService({}), ['Not a Knight service file (.kservice).']);
});

test('what the screen shows for each part', () => {
  const svc = newService('Grace Chapel');
  svc.church.giving = 'cash.app/$gracechapel';
  svc.church.website = 'gracechapel.org';
  const idx = (t) => svc.segments.findIndex((s) => s.type === t);
  const scripture = stageFrame(svc, idx('scripture'));
  assert.equal(scripture.church, 'Grace Chapel');
  assert.ok(scripture.text.startsWith('Make a joyful noise'));
  assert.equal(scripture.reference, 'Psalm 100 (KJV)');
  assert.ok(stageFrame(svc, idx('giving')).text.includes('Give: cash.app/$gracechapel'));
  const song = stageFrame(svc, idx('song'), { lyricNow: 'Amazing grace, how sweet the sound', lyricNext: 'that saved a wretch like me!' });
  assert.equal(song.lyricNow, 'Amazing grace, how sweet the sound');
  assert.equal(song.text, '');
  assert.equal(stageFrame(svc, 0).progress, `1 / ${svc.segments.length}`);
  assert.equal(stageFrame(svc, 0).footer, 'gracechapel.org');
  svc.poweredBy = false;
  assert.equal(stageFrame(svc, 0).poweredBy, false);
});

test('invite post and host script', () => {
  const svc = newService('Grace Chapel');
  svc.church.website = 'gracechapel.org';
  const post = invitePost(svc, 'Sunday at 10 AM');
  assert.ok(post.includes('Join Grace Chapel live Sunday at 10 AM'));
  assert.ok(post.includes('Amazing Grace, Jesus Loves Me'));
  assert.ok(post.includes('gracechapel.org'));
  const s = hostScript(svc, svc.segments[0], TEACHERS[1]);
  assert.ok(s.includes('MELODY GRACE: Welcome to our worship service!'));
});

test('services save and load', () => {
  const store = new Map();
  const storage = { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, v) };
  saveServices([newService('Grace Chapel')], storage);
  assert.equal(loadServices(storage)[0].church.name, 'Grace Chapel');
  storage.setItem('kk.services', '{bad');
  assert.deepEqual(loadServices(storage), []);
});
