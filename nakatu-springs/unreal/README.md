# Naka'tu Springs: Unreal Engine 5 project

The simulator from the master plan: Unreal Engine 5 with Cesium for Unreal, Google Photorealistic 3D Tiles for the land around the site, and the compounds you design in the browser placed at their real positions.

This folder holds the C++ code, config and a sample design. Levels and art are made in the editor (steps below) and are not in the repo yet.

## What you need

- Unreal Engine 5.5 from the Epic Games Launcher (5.4 also works: right-click `NakatuSprings.uproject` and choose Switch Unreal Engine version).
- A C++ compiler: Visual Studio 2022 with "Game development with C++" on Windows, or Xcode on a Mac.
- **Cesium for Unreal** from Fab, installed to the engine.
- A free [Cesium ion](https://ion.cesium.com) account. Google Photorealistic 3D Tiles can be added through Cesium ion, or with your own Google Maps Platform key with the Map Tiles API turned on.

## First run

1. Double-click `NakatuSprings.uproject` and let it build the C++ module.
2. Open the Cesium panel (Window > Cesium), connect to Cesium ion, then use Quick Add to add **Cesium SunSky** and **Google Photorealistic 3D Tiles** (or Cesium World Terrain plus imagery when Google's coverage of the site is thin).
3. Select **CesiumGeoreference** in the Outliner and set the origin latitude, longitude and height to the site origin (the values from the designer's **Site** settings).
4. Place a **Nakatu Design Loader** actor at location 0, 0, 0. Set **Design File** to `Designs/sample-design.json` (or your own export) and press **Rebuild** in its Details panel.
5. Save the level as `Content/Maps/NakatuSite` and press Play.

The loader turns each building into a box sized to its footprint and height and drops it onto the ground below. Fill **Mesh By Type** with real home models (and turn off **Scale To Footprint**) when the home kits are ready.

## How positions line up

The designer saves meters with x = east and y = north from the site center. Cesium for Unreal's georeference puts +X east, +Y south and +Z up at its origin, so a building at (x, y) lands at (100 x, -100 y) cm and its yaw is flipped. `UNakatuDesignLibrary::PlacementTransform` does this and the automation test `Nakatu.Design.Parse` checks it (Tools > Session Frontend > Automation).

Google's tiles are for context only. Their terms require on-screen attribution and do not allow caching them offline or cutting meshes out of them, so the editable site should be an Unreal Landscape built from survey or USGS elevation data (Milestone 0 in the plan).

## Files

- `NakatuSprings.uproject`: enables CesiumForUnreal, PCG and Water.
- `Source/NakatuSprings/Public/NakatuDesign.h`: design file structs and the Blueprint function library.
- `Source/NakatuSprings/Public/NakatuDesignLoader.h`: the actor that places a design in the level.
- `Designs/sample-design.json`: five compounds on the placeholder site. Regenerate with `node unreal/make-sample.mjs` after changing templates.
