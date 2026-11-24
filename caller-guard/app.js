// Caller Guard page logic. Everything stays on the phone (localStorage).
(function () {
  'use strict';
  var L = window.CallerLookup;
  var $ = function (id) { return document.getElementById(id); };

  // ---------- storage (never trusted to exist) ----------
  function load(key, fallback) {
    try { var v = localStorage.getItem('callerGuard.' + key); return v == null ? fallback : JSON.parse(v); }
    catch (e) { return fallback; }
  }
  function save(key, value) {
    try { localStorage.setItem('callerGuard.' + key, JSON.stringify(value)); } catch (e) { /* private mode */ }
  }

  // ---------- speech ----------
  var synth = window.speechSynthesis;
  function voices() { return synth ? synth.getVoices().filter(function (v) { return /^en/i.test(v.lang); }) : []; }
  function fillVoices() {
    var sel = $('voice'), chosen = load('voice', '');
    sel.innerHTML = '';
    var list = voices();
    if (!list.length) { sel.innerHTML = '<option value="">Default voice</option>'; return; }
    list.forEach(function (v) {
      var o = document.createElement('option');
      o.value = v.name; o.textContent = v.name + ' (' + v.lang + ')';
      if (v.name === chosen) o.selected = true;
      sel.appendChild(o);
    });
  }
  function say(text) {
    if (!synth) return;
    synth.cancel();
    var u = new SpeechSynthesisUtterance(text);
    var name = load('voice', '');
    var v = voices().filter(function (x) { return x.name === name; })[0];
    if (v) u.voice = v;
    u.rate = 0.95;
    synth.speak(u);
  }
  if (synth) { fillVoices(); synth.onvoiceschanged = fillVoices; }
  else { fillVoices(); $('readBtn').disabled = true; }

  // ---------- tabs ----------
  var tabs = document.querySelectorAll('nav button');
  function show(name) {
    tabs.forEach(function (b) { b.setAttribute('aria-selected', b.dataset.tab === name ? 'true' : 'false'); });
    ['setup', 'check', 'log', 'settings'].forEach(function (t) { $('tab-' + t).hidden = t !== name; });
    save('tab', name);
    window.scrollTo(0, 0);
  }
  tabs.forEach(function (b) { b.addEventListener('click', function () { show(b.dataset.tab); }); });

  // ---------- check ----------
  var RISK_LABEL = { high: 'Likely scam', caution: 'Be careful', low: 'Probably OK', unknown: 'Unknown' };
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  function summary(r) {
    var n = r.number;
    var who = n.kind === 'hidden' ? 'Blocked caller' : (r.place ? 'Caller from ' + r.place : 'Unknown caller');
    return who + '. ' + L.speakable(n.raw || n.display) + '. ' + RISK_LABEL[r.risk] + '.';
  }

  function check(value) {
    var r = L.lookup(value, load('mine', ''));
    var n = r.number;
    if (!n.raw) { $('result').innerHTML = ''; return; }
    var html = '<div class="card result">';
    html += '<h3>' + esc(n.display || n.raw) + '<span class="badge risk-' + r.risk + '">' + RISK_LABEL[r.risk] + '</span></h3>';
    if (r.place) html += '<p>' + esc(r.place) + (r.type === 'local' ? ' (by area code; the caller may have moved or ported the number)' : '') + '</p>';
    if (r.flags.length) html += '<ul class="flags">' + r.flags.map(function (f) { return '<li>' + esc(f) + '</li>'; }).join('') + '</ul>';
    if (n.kind === 'nanp' || n.kind === 'international') {
      var q = encodeURIComponent('"' + n.display + '"');
      html += '<p class="links">Search what others say: <a target="_blank" rel="noopener" href="https://www.google.com/search?q=' + q + '">Google</a> · ' +
        '<a target="_blank" rel="noopener" href="https://www.google.com/search?q=' + q + '+spam+OR+scam">spam reports</a></p>';
    }
    html += '<div class="row"><button class="btn small" data-act="read">🔊 Read</button><button class="btn small" data-act="log">Add to log</button></div>';
    html += '</div>';
    $('result').innerHTML = html;
    $('result').querySelector('[data-act="read"]').onclick = function () { say(summary(r)); };
    $('result').querySelector('[data-act="log"]').onclick = function () {
      $('logNum').value = n.kind === 'hidden' ? '' : (n.display || n.raw);
      $('logVerdict').value = r.risk === 'high' ? 'Spam / scam' : 'Unsure';
      show('log'); $('logSaid').focus();
    };
    if (load('autoRead', false)) say(summary(r));
  }

  $('checkBtn').onclick = function () { check($('num').value); };
  $('num').addEventListener('keydown', function (e) { if (e.key === 'Enter') check($('num').value); });
  $('readBtn').onclick = function () { say(L.speakable($('num').value)); };
  $('pasteBtn').onclick = function () {
    if (!navigator.clipboard || !navigator.clipboard.readText) { $('num').focus(); return; }
    navigator.clipboard.readText().then(function (t) { $('num').value = t.trim(); check(t); }, function () { $('num').focus(); });
  };

  // ---------- log ----------
  function getLog() { return load('log', []); }
  function renderLog() {
    var log = getLog(), box = $('logList');
    if (!log.length) { box.innerHTML = '<p class="empty">No calls logged yet.</p>'; return; }
    box.innerHTML = log.map(function (e, i) {
      var r = L.lookup(e.number || 'blocked');
      return '<div class="card log-item">' +
        '<div><b>' + esc(e.number || 'Blocked / No Caller ID') + '</b>' + (r.place ? ' <span class="note">' + esc(r.place) + '</span>' : '') + '</div>' +
        '<div><span class="badge ' + verdictClass(e.verdict) + '">' + esc(e.verdict) + '</span></div>' +
        '<div class="when">' + esc(new Date(e.at).toLocaleString()) + '</div>' +
        (e.said ? '<div class="said">' + esc(e.said) + '</div>' : '') +
        '<div class="acts"><button class="btn small" data-read="' + i + '">🔊 Read</button><button class="btn small" data-del="' + i + '">Delete</button></div>' +
        '</div>';
    }).join('');
  }
  function verdictClass(v) {
    return v === 'Spam / scam' ? 'risk-high' : v === 'Safe' ? 'risk-low' : v === 'Call back' ? 'risk-caution' : 'risk-unknown';
  }
  function speakEntry(e) {
    return (e.number ? 'Call from ' + L.speakable(e.number) : 'Blocked caller') + '. ' +
      new Date(e.at).toLocaleString([], { weekday: 'long', hour: 'numeric', minute: '2-digit' }) + '. ' +
      (e.said ? 'They said: ' + e.said + '. ' : '') + 'Marked ' + e.verdict.replace('/', 'or') + '.';
  }
  $('logList').addEventListener('click', function (ev) {
    var t = ev.target, log = getLog();
    if (t.dataset.read != null) say(speakEntry(log[+t.dataset.read]));
    if (t.dataset.del != null) { log.splice(+t.dataset.del, 1); save('log', log); renderLog(); }
  });
  $('logAdd').onclick = function () {
    var raw = $('logNum').value.trim();
    var n = L.normalize(raw);
    var log = getLog();
    log.unshift({ at: Date.now(), number: n.kind === 'hidden' ? '' : (n.display || raw), said: $('logSaid').value.trim(), verdict: $('logVerdict').value });
    save('log', log);
    $('logNum').value = ''; $('logSaid').value = ''; $('logVerdict').value = 'Unsure';
    renderLog();
  };
  $('logRead').onclick = function () {
    var log = getLog().slice(0, 10);
    say(log.length ? log.map(speakEntry).join(' ') : 'Your call log is empty.');
  };
  $('logClear').onclick = function () {
    if (!getLog().length) return;
    if ($('logClear').dataset.armed) { save('log', []); renderLog(); delete $('logClear').dataset.armed; $('logClear').textContent = 'Clear log'; return; }
    $('logClear').dataset.armed = '1'; $('logClear').textContent = 'Tap again to clear';
    setTimeout(function () { delete $('logClear').dataset.armed; $('logClear').textContent = 'Clear log'; }, 3000);
  };
  $('logExport').onclick = function () {
    var rows = [['When', 'Number', 'What they said', 'Verdict']].concat(getLog().map(function (e) {
      return [new Date(e.at).toLocaleString(), e.number || 'Blocked', e.said, e.verdict];
    }));
    var csv = rows.map(function (r) { return r.map(function (c) { return '"' + String(c).replace(/"/g, '""') + '"'; }).join(','); }).join('\n');
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = 'caller-guard-log.csv';
    document.body.appendChild(a); a.click(); a.remove();
  };

  // ---------- settings ----------
  $('mine').value = load('mine', '');
  $('mine').addEventListener('change', function () { save('mine', $('mine').value.trim()); });
  $('autoRead').checked = !!load('autoRead', false);
  $('autoRead').addEventListener('change', function () { save('autoRead', $('autoRead').checked); });
  $('voice').addEventListener('change', function () { save('voice', $('voice').value); });
  $('voiceTest').onclick = function () { say('Unknown caller. 7 6 0, 5 5 5, 0 1 3 4. Be careful.'); };

  // ---------- start ----------
  var here = location.href.split('?')[0].split('#')[0];
  $('shortcutUrl').textContent = here + '?n=';
  renderLog();
  var params = new URLSearchParams(location.search);
  if (params.get('n') != null) { show('check'); $('num').value = params.get('n'); check(params.get('n')); }
  else show(load('tab', 'setup'));
})();
