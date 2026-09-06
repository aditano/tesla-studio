# Original newer-vehicle assets

These four GLBs are original Tesla-inspired presentation meshes created for Tesla Studio. They replace the earlier runtime body primitives. No downloaded third-party mesh or texture is embedded in these files.

The surfaces are authored from longitudinal profiles and separate panel patches. Detail includes wheel openings, glazing, panel seals, mirror housings, light assemblies, tire tread, brake rotors and calipers, alternative wheel faces, seats, dashboard, display and door cards. Materials are separate for configurable paint, stainless steel, upholstery, glass and lighting.

## Rebuild

Run `npm ci`, then `npm run assets:build` from the repository root. The generator and lossless meshopt compressor are in `scripts/assets/`. Set `ASSET_PREVIEW_DIR` to an output folder to also export world-space geometry for offline inspection. The checked-in manifest records dimensions, triangle counts, draw meshes, file sizes and required rig nodes.

Coordinates use metres, +Y up and -Z forward. `body` carries the sprung body; wheel groups remain independent. Hinges use ordinary glTF node transforms and `hingeOrigin` metadata. Doors, hood, rear opening and charging flap are separate groups. Cybertruck also has a retracting tonneau group. Cybercab has rising front doors. Standard and sport wheel groups are alternatives; the app enables only one set.

All GLBs use required `EXT_meshopt_compression`, decoded by the bundled Three/Drei decoder. No external decoder URL or texture request is needed. The tests parse the actual binaries using the runtime loader and check geometry, budgets, wheelbase and hinge directions.

## Fidelity and references

These are original interpretations, not licensed factory CAD, scanned vehicles, or exact OEM option geometry. Additional triangles support detail and smooth surfaces but do not by themselves establish photorealism. The panel fit and material response remain approximate. Cybercab dimensions are estimates.

Principal dimensions were referenced to Tesla owner manuals:

- [Model 3 dimensions](https://www.tesla.com/ownersmanual/model3/en_us/GUID-56562137-FC31-4110-A13C-9A9FC6657BF0.html): 4.720 m length, 1.850 m body width, 2.875 m wheelbase.
- [Model Y dimensions](https://www.tesla.com/ownersmanual/modely/en_us/GUID-1E76B638-7B12-4D9A-8767-94B7F1E92A0E.html): 4.794 m length, 1.920 m body width, 2.890 m wheelbase.
- [Cybertruck dimensions](https://www.tesla.com/ownersmanual/cybertruck/en_us/GUID-12A976DD-EB60-431B-AFF1-5A37E95006DB.html): 5.6829 m length, 2.0316 m body width, 3.635 m wheelbase.
- [Cybercab reference](https://www.tesla.com/support/robotaxi/cybercab): two-seat concept with rising doors; mesh proportions estimated from imagery.

Tesla names and vehicle designs remain the property of their respective owner. The separate heritage assets retain their existing third-party licenses; this directory does not change those terms.
