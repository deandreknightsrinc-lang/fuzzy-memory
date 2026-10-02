// The puppet screen (puppet.html): the character the Puppet Studio is driving,
// on a green screen (or church colors) for OBS, a projector or a livestream.

import { teacherFaceSvg, FACE_CSS } from './ai-teacher.js';
import { applyPose, PUPPET_BACKGROUNDS } from './puppet.js';
import { teacherById } from './teachers.js';

document.head.append(Object.assign(document.createElement('style'), { textContent: FACE_CSS }));
const face = document.getElementById('face');
const lower = document.getElementById('lower');
let current = '';
const channel = new BroadcastChannel('knight-puppet');
channel.onmessage = (e) => {
  const d = e.data || {};
  if (d.teacher && d.teacher !== current) {
    current = d.teacher;
    face.innerHTML = teacherFaceSvg(teacherById(d.teacher));
    face.querySelector('svg').classList.remove('auto-blink');
    document.getElementById('hint')?.remove();
  }
  if (d.background) document.body.style.background = (PUPPET_BACKGROUNDS[d.background] || PUPPET_BACKGROUNDS.green).css;
  if (d.lower !== undefined) {
    lower.style.display = d.lower ? 'block' : 'none';
    lower.innerHTML = '';
    if (d.lower) {
      const t = teacherById(current);
      lower.append(t.name, Object.assign(document.createElement('small'), { textContent: d.lower === true ? t.role : d.lower }));
    }
  }
  if (d.pose) applyPose(face, d.pose);
  if (d.fx) {
    const fx = face.querySelector('.t-fx');
    if (fx) {
      fx.textContent = d.fx;
      fx.style.animation = 'none';
      void fx.getBoundingClientRect();
      fx.style.animation = '';
    }
  }
};
channel.postMessage({ hello: true });
document.addEventListener('dblclick', () => (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen?.()));
