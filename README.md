# Tesla Studio

An independent, noncommercial browser vehicle studio with configurable finishes, studio lighting, and guided feature demonstrations.

**Live:** [Tesla Studio](https://aditano.github.io/tesla-studio/)

## Experience

- Detailed artist-created original-generation Model 3 and Model S meshes, hosted in this repository.
- Artist-created Highland with original textures, configurable materials and a presentation rig.
- Original Juniper, Cybertruck and Cybercab GLB assets with separate fitted panels, glazing, detailed wheels and brakes, cabin furnishings and named animation hinges.
- Model and trim selection, exterior colors, interior finishes, and trim-specific sport hardware.
- Guided tours with eased camera moves followed by articulated demonstrations. Individual features can be selected, revisited, or exited.
- Studio, daylight and midnight lighting with generated reflection environments, clearcoat materials, contact shadows, floor reflections and restrained postprocessing.
- Touch orbit and pinch zoom, collapsible mobile controls, adaptive rendering quality, loading/error states, keyboard-accessible controls and a help/credits dialog.

## Controls

Drag to orbit; scroll or pinch to zoom. Select **Explore features** for an individual demonstration or **Take a guided tour** for a sequence. Manually orbiting pauses a guided tour. **Reset view** or Escape closes the vehicle and returns the camera to its exterior shot. Orbit rotation is opt-in.

## Fidelity and scope

This is a real-time WebGL showcase, **not an Unreal Engine renderer or a factory CAD configurator**. Highland now uses a licensed artist mesh with 179,692 preserved triangles, original textures and approximately 4 MB of compressed geometry. The other newer vehicles use original, reproducibly authored presentation meshes, with 118–161 thousand triangles and losslessly compressed GLBs of 2.1–2.6 MB each. These improve component detail and articulation, but remain interpretations rather than scanned or OEM CAD assets. Fine surface fidelity and physically accurate textures still limit photorealism. Cybercab proportions are estimated from reference imagery.

Heritage vehicles retain their actual older-generation labels. They are not passed off as Highland, Juniper or Plaid. Trim treatments, colors and interior selections are illustrative rather than a current Tesla ordering guide. No live pricing, range or performance figures are fabricated.

The heritage imported static meshes have presentation rigs created by partitioning surface triangles into hinged groups. These are approximate demonstrations, not factory articulation meshes; panel seams and interior detail can show limitations at close range. The wheel and paint treatments are visualization choices, not guaranteed exact OEM option geometry.

## Development

```sh
npm ci
npm run dev
npm test
npm run build
# Regenerate the four newer vehicle assets
npm run assets:build
```

The Vite base path remains `/tesla-studio/` for the existing GitHub Pages site. The rendering code is lazy-loaded separately from the interface. There are no remotely hosted HDR dependencies; the reflection environment is generated in Three.js. Imported meshes and their textures are served from `public/models/`. Google Fonts is optional, with local system-font fallback.

`npm test` covers model/trim/feature selection, camera-shot coverage, state reset and invalid options, procedural geometry validity, parsing the actual heritage asset buffers through Three.js, and decoding all four compressed GLBs with the runtime loader, validating geometry budgets and hinge directions. The imported Highland test verifies source triangle preservation, texture paths, scale and rig coverage. Textures are stubbed only during the headless geometry test, with file existence checked separately. These are structural tests, not GPU screenshot or browser interaction tests.

GitHub Actions runs a clean install, the tests, TypeScript and the production build, then publishes the result to the existing `gh-pages` branch on pushes to `main`.

## Architecture

- `src/studio/catalog.ts`: vehicles, variants, palettes and feature availability.
- `src/studio/store.ts`: configuration, tour focus, animation state and reset behavior.
- `src/studio/Studio.tsx`: responsive configurator and guided-tour orchestration.
- `src/studio/scene/`: lighting, quality settings and deterministic camera shots.
- `src/studio/vehicles/HeritageVehicle.tsx`: glTF normalization, material adaptation and demonstration rig.
- `src/studio/vehicles/AuthoredVehicle.tsx`: compressed GLB loading, configuration and named-part animation.
- `scripts/assets/`: reproducible geometry authoring and lossless mesh compression.
- `public/models/authored/`: newer vehicle GLBs, geometry manifest and reference notes.
- `src/studio/vehicles/`: model-specific articulation and bodywork.

## Asset credits and license

The Highland asset is by **RBLXSupercars**, shared by **brandonleong28**, under **CC BY 4.0**. Its full provenance, source link and modifications are in [Highland credits](public/models/highland/CREDITS.md). See [asset sourcing notes](docs/asset-sourcing.md) for the remaining newer vehicles.


The following assets are by **iSteven** and licensed **CC BY-NC 4.0**. Their original `license.txt` files are retained alongside the assets, and credits are accessible from the in-app help dialog.

- [Tesla Model 3](https://sketchfab.com/3d-models/tesla-model-3-117d7dbdd6f94df9886c42995cdd06db) by [iSteven](https://sketchfab.com/Steven007), [CC BY-NC 4.0](https://creativecommons.org/licenses/by-nc/4.0/).
- [Tesla Model S](https://sketchfab.com/3d-models/tesla-model-s-1360e3cf7323487eaba8ce94279229b6) by [iSteven](https://sketchfab.com/Steven007), [CC BY-NC 4.0](https://creativecommons.org/licenses/by-nc/4.0/).

Asset files were obtained from the credited copies in [Gregd713/TeslaFactory](https://github.com/Gregd713/TeslaFactory/tree/main/public). Runtime adaptations include transform normalization, new material treatments, color configuration and approximate panel articulation. Noncommercial use only under the asset license; this does not relicense unrelated source code.

Vehicle identity references: [Model 3](https://www.tesla.com/model3), [Model Y](https://www.tesla.com/modely), [Cybertruck](https://www.tesla.com/cybertruck). Catalog entries represent the designs in this showcase, not a claim about current availability.

Tesla and model names are trademarks of Tesla, Inc. This project is not affiliated with or endorsed by Tesla.
