// Writes Designs/sample-design.json: the placeholder site with a few compounds placed.
// Run: node unreal/make-sample.mjs
import { writeFileSync } from 'node:fs';
import { makeSite, placeCompound, toUnreal } from '../js/model.js';

export function sampleDesign() {
  const d = makeSite({ name: "Naka'tu Springs (sample)" });
  placeCompound(d, 'E1', 'courtyard-ring');
  placeCompound(d, 'E2', 'ranch-row');
  placeCompound(d, 'E3', 'multi-generation');
  placeCompound(d, 'E7', 'hillside-terrace');
  placeCompound(d, 'E8', 'estate-manor');
  return toUnreal(d);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  writeFileSync(new URL('./Designs/sample-design.json', import.meta.url), `${JSON.stringify(sampleDesign(), null, 2)}\n`);
}
