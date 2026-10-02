// Runs the quick stem split off the main thread so the pads keep playing.
import { splitStems, instrumental } from './stems.js';

self.onmessage = (e) => {
  const { left, right, sampleRate, twoStems } = e.data;
  try {
    const stems = splitStems(left, right || left, sampleRate, {
      onProgress: (p) => self.postMessage({ progress: p }),
    });
    const result = twoStems ? { vocals: stems.vocals, instrumental: instrumental(stems) } : stems;
    const transfer = Object.values(result).flatMap((chs) => chs.map((c) => c.buffer));
    self.postMessage({ done: true, stems: result }, transfer);
  } catch (err) {
    self.postMessage({ error: err.message || String(err) });
  }
};
