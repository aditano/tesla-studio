# Tesla Cybercab 3D Scan — not bundled

The runtime Cybercab is still the original authored study in `public/models/authored/cybercab.glb`. This folder is the landing place for the CC BY download. No mesh has been invented to stand in for it.

- Artist: [Grass Grass Grass (@zwir3kk)](https://sketchfab.com/zwir3kk)
- Source: [Tesla Cybercab 3D Model](https://sketchfab.com/3d-models/tesla-cybercab-3d-model-45c25fd8442b45129e47be2e66449ca3)
- License: [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) (commercial use allowed with attribution)
- Sketchfab uid: `45c25fd8442b45129e47be2e66449ca3`
- Reported size: about 99,230 triangles. Source file is FBX (`tripo_convert_…fbx`).

The official download API returns HTTP 401 without a Sketchfab account token (`mayDownloadThisModel` is false for anonymous requests). The viewer geometry is an encrypted `.binz`, not a GLB, and is not used here.

## Download, then import

1. Create a token at https://sketchfab.com/settings/password (a free account can download CC BY models).
2. From the repository root:

```sh
SKETCHFAB_TOKEN=... node scripts/assets/fetch-sketchfab.mjs 45c25fd8442b45129e47be2e66449ca3 /tmp/zwir3kk-cybercab.glb
node scripts/assets/import-presentation.mjs /tmp/zwir3kk-cybercab.glb public/models/cybercab-import/model.glb --length 4.12
```

If the API returns an FBX instead of a GLB, convert it to glTF with Blender (`File → Export → glTF 2.0`) and pass that GLB to `import-presentation.mjs`.

3. Point `vehicleGlb("cybercab")` in `src/studio/vehicles/assets.ts` at `cybercab-import/model.glb`, credit zwir3kk in the help dialog, and keep this notice.

Do not substitute a paid CGTrader, Sketchfab Store, or other marketplace pack. This project is not endorsed by Tesla.
