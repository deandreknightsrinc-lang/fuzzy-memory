// The stream screen (stage.html): shows whatever the Church window is showing.
// Put it on the projector, or capture it in OBS to stream to YouTube or Facebook.

import { renderStage, STAGE_CSS } from './stage-view.js';

document.head.append(Object.assign(document.createElement('style'), { textContent: STAGE_CSS }));
const el = document.getElementById('stage');
const channel = new BroadcastChannel('knight-stage');
channel.onmessage = (e) => {
  if (e.data?.frame) {
    document.getElementById('hint')?.remove();
    renderStage(el, e.data.frame);
    document.title = `${e.data.frame.church} · ${e.data.frame.title}`;
  }
};
channel.postMessage({ hello: true });
document.addEventListener('dblclick', () => (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen?.()));
