# Newer vehicle asset sourcing

Reviewed 2026-09-07, then updated after the owner uploaded Sketchfab zips. Re-searched the same day without a Sketchfab account: official download API returns HTTP 401 for the CC BY production meshes, and no license-clean GitHub/jsDelivr mirrors exist.

| Vehicle | Result | Action |
| --- | --- | --- |
| Model 3 Highland | Actual GLB downloaded from a credited GitHub copy; embedded CC BY 4.0 attribution; 179,692 triangles and original textures. | Integrated. See `public/models/highland/CREDITS.md`. Spatial door/hood cuts were removed: the source is a merged export and tearing the paint is worse than a closed body. Feature tours for those panels are camera-only. |
| Model Y Juniper | Owner uploaded BloxBloger 2025 Tesla Model Y (CC BY-NC OBJ, 307k tris, 89 objects). MTL was missing from the zip. | Integrated as `public/models/juniper/model.glb`. Static body. |
| Cybertruck | Owner uploaded the Sketchfab "Tesla Cybertruck 2025" zip (Nieve5677, CC BY, 72.7k). Sketcher's 380k production mesh was not in the upload. | Archived at `public/models/cybertruck-import/model.glb` (static, single steel role, width squeezed to 2.21 m). **Viewer still uses the articulated authored study** so doors, frunk, bed, tonneau and charge keep working. |
| Cybercab | Grass Grass Grass (@zwir3kk) CC BY 4.0 "Tesla Cybercab 3D Scan", 99.2k, Oct 2024 thumbnail matches the gold reveal vehicle. Download requires a Sketchfab account. Ai 3D Designs "Tesla Robo Taxi" CC BY 1.5M is login-gated and too dense for this runtime. | Viewer still uses the original authored concept study. No public GLB/GLTF mirror found. |

Sources reviewed:

- Highland: https://github.com/erictfree/Carbon-Footprint-AI-Visualizer/tree/af4bef33ca371b24c1f043486f09a13571f4919b/models/tesla-model-3-2024
- Juniper artist listing (not free): https://sketchfab.com/3d-models/2025-tesla-model-y-619601e7800d418da5922c4fa7833f74
- Original Model Y, wrong generation: https://sketchfab.com/3d-models/tesla-model-y-bc8ac22c744b4d11b92f2f31ab0297d0
- Production Cybertruck CC BY, login-gated: https://sketchfab.com/3d-models/tesla-cybertruck-587a0833e60f465090145b139f6c1bfc
- Concept Cybertruck, not used: https://sketchfab.com/3d-models/tesla-cybertruck-1e478c81e438490389713bd69b1eb18b
- Crude 2025 Cybertruck CC BY, not used: https://sketchfab.com/3d-models/tesla-cybertruck-2025-0fe4980c8cbc441382bfb7d4cf9f092e
- Cybertruck credited public copy (concept): https://github.com/prabhatsingh415/Tesla_Landing_Page/tree/456a6ba3f6e1534c40bb8d1bc932cd6766db3edb/TeslaLandingPage/public/threeDModels/tesla-cyberTruck
- Cybercab 3D scan CC BY, login-gated: https://sketchfab.com/3d-models/tesla-cybercab-3d-model-45c25fd8442b45129e47be2e66449ca3
- Cybercab commercial candidate, with opening doors and trunk: https://www.cgtrader.com/3d-models/car/concept-car/tesla-cybercab-robotaxi
- Detailed commercial Cybercab candidate: https://www.renderhub.com/hkv-studios/2026-tesla-cybercab
- A repository containing newer Tesla body/wheel GLBs explicitly says their license is unspecified. Those files were not imported: https://github.com/Fexiven/ha-tesla-3d-card/blob/main/CREDITS.md

## Commercial listings (not purchased)

These are generation-correct candidates. Licenses must support **browser delivery and publishing the source file in this public GitHub repository**. A royalty-free product listing does not automatically permit that. Editorial licenses do not.

| Listing | Price | Format | Rig / notes | Redistribution |
| --- | --- | --- | --- | --- |
| [TurboSquid 2379544](https://www.turbosquid.com/3d-models/3d-black-tesla-model-y-juniper-2025-2379544) Black Tesla Model Y Juniper 2025 | $149 | Native 3ds Max; conversions include glTF, FBX, OBJ, Blender. 125,218 polys, StemCell, textures, PBR. | Not described as a mechanical hinge rig. | **Editorial Uses Only** on the Standard License. Unsuitable for this public repo. |
| [3DExport 621603](https://3dexport.com/3d-model-tesla-model-y-juniper-2025-621603) Tesla Model Y Juniper 2025 | $175 | 483,595 polys, textured, UV mapped, not animated/rigged. Conversion to glb offered. | No rig. | Royalty-free Basic covers web apps as an *end product*; republishing the raw mesh in a public Git repo is typically outside that grant. Confirm in writing before buying. |
| CGTrader Tesla Cybercab Robotaxi | Paid (listing varies) | Opening doors and trunk advertised. | Animated doors claimed. | Confirm whether source redistribution to GitHub Pages is allowed. |
| Renderhub 2026 Tesla Cybercab (HKV Studios) | Paid | High-detail commercial. | Unknown. | Same restriction: confirm source-file redistribution. |

If one of the CC BY Sketchfab files is downloaded later from an authorized account, credit the author, keep the CC BY 4.0 notice, and document modifications. Do not use the 2019 concept Cybertruck or the original Model Y as a stand-in for Juniper. The Sketcher production Cybertruck and zwir3kk Cybercab scan remain the best CC BY matches; both require a Sketchfab login to download.

## 2026-09-07 login-free search

Confirmed against the live Sketchfab API and public GitHub/CDN mirrors. Do not repeat these fetches expecting a different result without a token.

| Candidate | License | Faces | Fetch | Verdict |
| --- | --- | --- | --- | --- |
| [Sketcher production Cybertruck](https://sketchfab.com/3d-models/tesla-cybertruck-587a0833e60f465090145b139f6c1bfc) | CC BY 4.0 | 380,876 | `GET /v3/models/587a0833…/download` → **401** | Best production match. Needs `SKETCHFAB_TOKEN`. |
| [Mr3DDD Cybertruck](https://sketchfab.com/3d-models/tesla-cybertruck-e95c44b87b57467098c82ba9f316f36d) | CC BY 4.0 | 274,062 | Same 401 | Second-best production-lean CC BY. |
| [zwir3kk Cybercab scan](https://sketchfab.com/3d-models/tesla-cybercab-3d-model-45c25fd8442b45129e47be2e66449ca3) | CC BY 4.0 | 99,230 | Same 401 | Best gold-reveal match. |
| [Nieve5677 2025](https://sketchfab.com/3d-models/tesla-cybertruck-2025-0fe4980c8cbc441382bfb7d4cf9f092e) | CC BY 4.0 | 72,672 | Already in-repo | Crude static import; not used at runtime. |
| hashikemu / Lexyc16 / PolyDucky GitHub mirrors | CC BY 4.0 | 8k–28k | curl works | **2019 concept.** Not used. |
| [Poly Pizza Mobolaji](https://poly.pizza/m/Jpar3f32mt) | CC BY | 19,268 | `https://static.poly.pizza/bd53628e-9ef8-4809-a8e1-8aa680186d0f.glb` (1.0 MB) | Stylized blockout. Not used. |
| [3DExport 479016 free production](https://3dexport.com/3d-model-tesla-cybertruck-2024-production-version-479016) | Royalty-free Basic | 175k | Marketplace account | End-product only; raw mesh must not be retrievable. Unsuitable for this public repo. |
| `starbadboy/tesla` wrap-gallery scrape | App MIT, mesh rights Tesla | 134k | GitHub raw | Do not import. |
| `Fexiven/ha-tesla-3d-card` | Unspecified Tesla rights | — | — | Still excluded. |
| BloxBloger Juniper MTL | CC BY-NC 4.0 | — | No public OBJ+MTL mirror | Juniper keeps procedural materials from `usemtl` names. |

Helper once a token exists:

```sh
SKETCHFAB_TOKEN=... node scripts/assets/fetch-sketchfab.mjs 587a0833e60f465090145b139f6c1bfc /tmp/sketcher-cybertruck.glb
SKETCHFAB_TOKEN=... node scripts/assets/fetch-sketchfab.mjs 45c25fd8442b45129e47be2e66449ca3 /tmp/zwir3kk-cybercab.glb
```

## 2026-09-07 evening login-free search

Re-checked env, shell rc, and `.env*` — no `SKETCHFAB_TOKEN`. Official download for Sketcher (`587a0833…`) still **401**. Metadata without a token still works.

| Candidate | License | Faces | Fetch | Verdict |
| --- | --- | --- | --- | --- |
| [Sketcher / jnanbr07](https://sketchfab.com/3d-models/tesla-cybertruck-587a0833e60f465090145b139f6c1bfc) | CC BY 4.0 | 380,876 | Download **401** | Still the best production match. |
| [TAIGA-ZOE](https://sketchfab.com/3d-models/tesla-cybertruck-8950fc178e254c9198b2a8555ef1590a) | CC BY 4.0 | 380,936 | Same 401 | Near-identical production mesh; same login wall. |
| [adamsochi2010 / Mr3DDD](https://sketchfab.com/3d-models/tesla-cybertruck-e95c44b87b57467098c82ba9f316f36d) | CC BY 4.0 | 274,062 | Same 401 | Second-best production-lean CC BY. |
| [zwir3kk Cybercab](https://sketchfab.com/3d-models/tesla-cybercab-3d-model-45c25fd8442b45129e47be2e66449ca3) | CC BY 4.0 | 99,230 | Same 401 | Still the best gold-reveal match. |
| [BloxBloger Juniper](https://sketchfab.com/3d-models/2025-tesla-model-y-619601e7800d418da5922c4fa7833f74) | CC BY-NC 4.0 | 307,399 | Already in-repo; no public OBJ+MTL/texture mirror | Keep procedural materials. |
| [MaikoCode/apex-drift-oss](https://github.com/MaikoCode/apex-drift-oss) `cybertruck.glb` | Repo MIT; mesh uncredited | 17,409 | GitHub raw 1.7 MB | Single merged game mesh, no author/license for the body. Not imported. |
| Other GitHub `cybertruck.glb` hits (sceneview, pico_traffic, wrap-factory, Tesla landing pages) | Unspecified or 2019 concept | 8k–28k or unknown | Partial raw 404s | Excluded: concept, unspecified Tesla rights, or not downloadable. |
| Wikimedia Commons `filetype:3d` Tesla Cybertruck / Cybercab | — | — | API `totalhits: 0` | No 3D files. |
| Smithsonian 3d.si.edu | — | — | Search gated (HTTP 403) | No public Tesla mesh found. |
| Poly Pizza Mobolaji | CC BY | 19,268 | Already reviewed | Stylized blockout. Not used. |
| Commercial / scraper hosts (CGTrader, 88cars3d, freecreat, CGHub) | Royalty-free or unspecified | — | Account or paid | Raw-mesh republish in this public repo is not allowed. |

Viewer still uses the articulated authored Cybertruck and Cybercab studies. The in-repo Nieve5677 import remains archived for comparison; it is static, crude, and width-squeezed. A same-session browser load of that import as the runtime truck did not produce a usable studio frame, so it does not replace the authored study. Do not treat either authored vehicle as a finished production mesh.