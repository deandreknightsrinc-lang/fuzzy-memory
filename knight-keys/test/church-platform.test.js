import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { blankChurch, normalizeChurch, validateChurch, setupChecklist, safeUrl, slugify, networkList, embedFor, appLink, serviceBrand, churchToFile, CHURCH_FORMAT, FLAGSHIP_ID, ACADEMY_COURSES } from '../../church/js/profile.js';
import { renderHome, themeCss, esc } from '../../church/js/render.js';
import { COURSES } from '../js/lessons.js';
import { BUNDLED_PACKS } from '../js/course-packs.js';
import { teacherById } from '../js/teachers.js';

const json = (p) => JSON.parse(readFileSync(new URL(p, import.meta.url), 'utf8'));
const bac = json('../../church/churches/bac-ministries.json');
const index = json('../../church/churches/index.json');

function sample(extra = {}) {
  return normalizeChurch({
    ...blankChurch('Grace Chapel'),
    tagline: 'Welcome home',
    about: 'We love God and people.\n\nCome as you are.',
    address: '1 Main St, Macon, GA',
    leader: { name: 'Pastor Jane Doe', title: 'Senior Pastor', photo: '' },
    links: { ...blankChurch().links, live: 'https://youtu.be/abcdef12345', giving: 'cash.app/$grace', email: 'hello@grace.org', phone: '(555) 123-4567' },
    sermons: [{ title: 'Faith', speaker: 'Pastor Jane', date: '2026-09-27', video: 'https://www.youtube.com/watch?v=zzzzzz11111' }, { title: 'Hope', video: 'https://vimeo.com/123456' }],
    events: [{ title: 'Bible study', date: 'Wednesdays 7 PM', text: 'In the fellowship hall' }],
    ...extra,
  });
}

test('BAC Ministries is the flagship and the home church of the network', () => {
  assert.deepEqual(validateChurch(bac), []);
  assert.equal(bac.id, FLAGSHIP_ID);
  assert.equal(index.home, FLAGSHIP_ID);
  assert.equal(networkList(index)[0].id, FLAGSHIP_ID);
  assert.ok(Object.values(normalizeChurch(bac).programs).every(Boolean), 'BAC offers every program');
  const list = networkList({ churches: [{ id: 'zion', name: 'Zion' }, { id: 'abba', name: 'Abba House' }, { id: FLAGSHIP_ID, name: 'BAC Ministries' }, { id: '', name: 'No id' }] });
  assert.deepEqual(list.map((x) => x.id), [FLAGSHIP_ID, 'abba', 'zion'], 'flagship first, then by name; broken entries dropped');
});

test('church files: web names, cleanup and validation', () => {
  assert.equal(slugify('Grace Chapel A.M.E. & Friends!'), 'grace-chapel-a-m-e-and-friends');
  assert.equal(slugify('Iglesia Bautista Peñuelas'), 'iglesia-bautista-penuelas');
  const c = normalizeChurch({ format: CHURCH_FORMAT, name: '  New Hope  ', color: 'red', times: [{ day: 'Funday', time: '10 AM' }, { time: '' }], academy: ['piano', 'kazoo'], extra: 'dropped' });
  assert.equal(c.id, 'new-hope');
  assert.equal(c.name, 'New Hope');
  assert.equal(c.color, '#7c3aed', 'bad colors fall back');
  assert.deepEqual(c.times, [{ day: 'Sunday', time: '10 AM', label: '' }]);
  assert.deepEqual(c.academy, ['piano']);
  assert.ok(!('extra' in c));
  assert.equal(c.poweredBy, true, 'powered-by credit is on unless turned off');
  assert.deepEqual(validateChurch({ name: 'x' }), ['Not a church file (church.json from the church platform setup).']);
  assert.ok(validateChurch({ format: CHURCH_FORMAT }).includes('Add your church\'s name.'));
  assert.ok(validateChurch({ format: CHURCH_FORMAT, name: 'A', links: { giving: 'javascript:alert(1)' } }).some((e) => e.includes('giving')));
  assert.deepEqual(validateChurch(JSON.parse(churchToFile(sample()))), [], 'a saved file opens again');
  assert.ok(setupChecklist(blankChurch('X')).includes('Your giving link'));
  assert.ok(!setupChecklist(sample()).includes('Your giving link'));
});

test('only safe links get on the page', () => {
  assert.equal(safeUrl('https://grace.org'), 'https://grace.org');
  assert.equal(safeUrl('grace.org/give'), 'https://grace.org/give');
  assert.equal(safeUrl('hello@grace.org'), 'mailto:hello@grace.org');
  for (const bad of ['javascript:alert(1)', 'JavaScript:alert(1)', 'data:text/html,hi', '//evil.com', 'just words', 'vbscript:x']) assert.equal(safeUrl(bad), '', bad);
  assert.equal(embedFor('https://youtu.be/abcdef12345').src, 'https://www.youtube-nocookie.com/embed/abcdef12345?rel=0');
  assert.equal(embedFor('https://www.youtube.com/live/abcdef12345').kind, 'youtube');
  assert.equal(embedFor('https://vimeo.com/123456').kind, 'vimeo');
  assert.equal(embedFor('https://facebook.com/grace/videos/1'), null, 'Facebook stays a link');
  assert.equal(embedFor('javascript:alert(1)//.mp4'), null);
});

test('the home page shows what the church filled in', () => {
  const html = renderHome(sample());
  for (const s of ['Grace Chapel', 'Welcome home', 'Join us', '11:00 AM', 'Directions', 'youtube-nocookie.com/embed/zzzzzz11111', 'Hope', 'Learn and grow', 'Pastor Jane Doe', 'Come as you are.', 'Bible study', 'tel:5551234567', 'mailto:hello@grace.org', 'https://cash.app/$grace', 'Powered by', 'setup.html']) assert.ok(html.includes(s), s);
  assert.ok(html.includes('href="../knight-keys/?church=grace-chapel#lessons=piano"'), 'lessons open Knight Keys for this church');
  assert.ok(html.includes('#band') && html.includes('#church'));
  assert.ok(!html.includes('id="network"'), 'the network section is on the flagship only');
  // Sections without content stay hidden.
  const bare = renderHome({ format: CHURCH_FORMAT, name: 'Tiny', times: [], programs: { online: false, academy: false, band: false, courses: false, kids: false } });
  for (const s of ['Join us', 'Online church', 'Learn and grow', 'About us', 'Coming up', 'id="give"']) assert.ok(!bare.includes(s), s);
  assert.ok(!renderHome(sample({ poweredBy: false })).includes('Powered by'));
});

test('the flagship page invites other churches and lists the network', () => {
  const html = renderHome(bac, { network: networkList({ churches: [...index.churches, { id: 'grace-chapel', name: 'Grace Chapel', city: 'Macon, GA' }] }) });
  assert.ok(html.includes('id="network"'));
  assert.ok(html.includes('Start your church\'s free platform'));
  assert.ok(html.includes('href="./?c=grace-chapel"') && html.includes('Macon, GA'));
  assert.ok(!html.includes('Powered by'), 'BAC doesn\'t credit itself');
  assert.ok(html.includes('Worship Team Training') && html.includes('Producer Nova'));
});

test('nothing in a church file can inject code into the page', () => {
  const evil = '<img src=x onerror=alert(1)>"\'';
  const html = renderHome(sample({ name: evil, tagline: evil, about: evil, address: evil, logo: 'javascript:alert(1)', heroImage: "https://x.org/a.jpg');background:url(javascript:alert(1)", leader: { name: evil, title: evil }, events: [{ title: evil, date: evil, text: evil }], sermons: [{ title: evil, speaker: evil, video: 'javascript:alert(1)' }] }));
  assert.ok(!html.includes('<img src=x'), 'tags are escaped');
  assert.ok(!/href="javascript:/i.test(html) && !/src="javascript:/i.test(html));
  const style = /--hero: url\('([^"]*)'\)"/.exec(html)[1];
  assert.ok(!/['()]|&#39;|&quot;/.test(style), 'the picture link cannot break out of its style');
  assert.ok(style.startsWith('https://x.org/a.jpg%27%29'));
  assert.equal(esc('<a href="x">\'&'), '&lt;a href=&quot;x&quot;&gt;&#39;&amp;');
  assert.equal(themeCss({ color: 'red;}body{display:none' }), ':root { --kc-color: #7c3aed; --kc-accent: #c9a227; }');
});

test('academy courses and teachers exist in Knight Keys', () => {
  const ids = new Set([...COURSES.map((c) => c.id), ...BUNDLED_PACKS.map((p) => p.id)]);
  for (const c of ACADEMY_COURSES) {
    assert.ok(ids.has(c.id), c.id);
    assert.ok(teacherById(c.teacher).id === c.teacher, c.teacher);
  }
});

test('Knight Keys links and the Virtual Church brand', () => {
  const c = sample();
  assert.equal(appLink(c, 'band'), '../knight-keys/?church=grace-chapel#band');
  assert.equal(appLink({}, ''), '../knight-keys/');
  const b = serviceBrand(c);
  assert.equal(b.name, 'Grace Chapel');
  assert.equal(b.giving, 'cash.app/$grace');
  assert.equal(b.color, '#7c3aed');
  assert.ok('social' in b && 'website' in b && 'logo' in b && 'tagline' in b);
});
