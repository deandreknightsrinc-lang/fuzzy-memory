# Naka'tu Springs Simulator

Design the Naka'tu Springs community, starting with the family compounds and estates. The full plan (vision, phases, tech stack, roadmap) is in the [master plan doc](https://claude.ai/artifact/PbuUWaZzWfeu8wsxNW9AiU).

There are two parts that share one design file:

| Part | Where | What it is for |
| --- | --- | --- |
| Family Compound Designer | `index.html` (GitHub Pages under `/nakatu-springs/`) | Lay out estates and compounds in the browser, today, on any computer |
| Unreal Engine 5 project | [`unreal/`](unreal/) | The real-world simulator: the site on the Cesium globe with Google's photorealistic 3D tiles around it |

## Family Compound Designer

Open `index.html` through a local server (`npm start`, then http://localhost:5175) or the Pages site.

1. Click an estate on the map (or in the Estates list).
2. Click a compound template on the left, or drag it onto an estate: Courtyard Ring, Ranch Row, Hillside Terrace, Multi-Generation Cluster, Estate Manor.
3. Click a building to change its type, size, bedrooms or direction. Click it again and drag to move it.
4. Site rules turn a building red when it is too close to the estate line, the springs or another building. Click a problem to jump to it.
5. **Walk** puts you at eye level in front of the selected compound (W A S D, drag to look, Shift to run, Esc to stop). The **Sun** slider sets the time of day.
6. **Save and export** keeps named options, compares them side by side, and saves files:
   - **Design for Unreal (.json)** loads into the Unreal project.
   - **Map layers (.geojson)** opens in Google Earth, QGIS or any GIS tool (set the latitude and longitude under **Site** first).
   - **Picture (.png)** of the current view.

Everything is saved in the browser as you go, and **Undo** (Ctrl+Z) steps back.

The site is a placeholder (about 277 acres, 12 estates of 18.5 acres on both sides of a main road, with a springs preserve at the east end) until the real boundary and coordinates are in. **Site** changes the name, coordinates, rule distances and number of estates.

## Code

- `js/model.js`: the design model with no browser code: site, estates, templates, rules, stats, GeoJSON and Unreal export. Units are meters, x east, y north.
- `js/app.js`: the 3D designer (three.js r160, vendored in `vendor/three`).
- `unreal/`: the Unreal Engine 5 C++ project. See its README.
- `npm test` runs the model tests.
