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

### Using the real land

Until the real boundary is loaded, the designer uses a placeholder site: about 277 acres, with 12 estates of 18.5 acres on both sides of a main road and a springs preserve at the east end.

1. In Google Earth (or Google My Maps), draw the land as a polygon and export it as KML. A GeoJSON file from a surveyor works too.
2. Open **Site** and press **Load boundary**. The designer sets the latitude and longitude from the boundary. It runs the main road along the long side of the land, keeps a preserve at the far end, and splits the rest into estates (slivers under half an acre are left out).
3. Press **Place the springs on the map** and click where the springs really are.
4. Change the number of estates in **Site** at any time. Names, family names and compounds on estates that still exist are kept.

**Site** also sets the name, the coordinates and the rule distances. Designs saved before estates could have real shapes open as before.

## Code

- `js/model.js`: the design model with no browser code: site, estates, templates, rules, stats, GeoJSON and Unreal export. Units are meters, x east, y north.
- `js/app.js`: the 3D designer (three.js r160, vendored in `vendor/three`).
- `unreal/`: the Unreal Engine 5 C++ project. See its README.
- `npm test` runs the model tests.
