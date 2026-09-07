# Newer vehicle asset sourcing

Reviewed 2026-09-07, then updated after the owner uploaded Sketchfab zips.

| Vehicle | Result | Action |
| --- | --- | --- |
| Model 3 Highland | Actual GLB downloaded from a credited GitHub copy; embedded CC BY 4.0 attribution; 179,692 triangles and original textures. | Integrated. See `public/models/highland/CREDITS.md`. Spatial door/hood cuts were removed: the source is a merged export and tearing the paint is worse than a closed body. Feature tours for those panels are camera-only. |
| Model Y Juniper | Owner uploaded BloxBloger 2025 Tesla Model Y (CC BY-NC OBJ, 307k tris, 89 objects). MTL was missing from the zip. | Integrated as `public/models/juniper/model.glb`. Static body. |
| Cybertruck | Owner uploaded the Sketchfab "Tesla Cybertruck 2025" zip (Nieve5677, CC BY, 72.7k). Sketcher's 380k production mesh was not in the upload. | Integrated as `public/models/cybertruck-import/model.glb`. Static body. Width squeezed to 2.21 m. |
| Cybercab | Grass Grass Grass (@zwir3kk) CC BY 4.0 "Tesla Cybercab 3D Scan", 99.2k, Oct 2024 thumbnail matches the gold reveal vehicle. Download requires a Sketchfab account. Ai 3D Designs "Tesla Robo Taxi" CC BY 1.5M is login-gated and too dense for this runtime. | Original concept study rebuilt with a shorter teardrop, smile light bar, roof-hinged canopy doors, full-disc aero covers and no handles/mirrors. |

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