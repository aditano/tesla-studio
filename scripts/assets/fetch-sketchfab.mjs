/** Download a Sketchfab model through the official API.
 * Requires SKETCHFAB_TOKEN from https://sketchfab.com/settings/password
 * Anonymous calls return HTTP 401. Do not scrape the encrypted viewer .binz.
 *
 * Preferred CC BY targets (checked 2026-09-25, both downloadable only with a token):
 *   Cybertruck (Sketcher, ~381k tris):
 *     SKETCHFAB_TOKEN=... node scripts/assets/fetch-sketchfab.mjs 587a0833e60f465090145b139f6c1bfc /tmp/sketcher-cybertruck.glb
 *     node scripts/assets/import-presentation.mjs /tmp/sketcher-cybertruck.glb public/models/cybertruck-import/model.glb --length 5.6829
 *   Cybercab (zwir3kk, ~99k tris):
 *     SKETCHFAB_TOKEN=... node scripts/assets/fetch-sketchfab.mjs 45c25fd8442b45129e47be2e66449ca3 /tmp/zwir3kk-cybercab.glb
 *     node scripts/assets/import-presentation.mjs /tmp/zwir3kk-cybercab.glb public/models/cybercab-import/model.glb --length 4.12
 *
 * Usage: SKETCHFAB_TOKEN=... node scripts/assets/fetch-sketchfab.mjs <uid> <out.glb>
 */
const uid = process.argv[2];
const out = process.argv[3];
const token = process.env.SKETCHFAB_TOKEN;
if (!uid || !out || !token) {
  console.error(
    "Usage: SKETCHFAB_TOKEN=... node scripts/assets/fetch-sketchfab.mjs <uid> <out.glb>",
  );
  process.exit(1);
}
const meta = await fetch(`https://api.sketchfab.com/v3/models/${uid}`, {
  headers: { Authorization: `Token ${token}` },
}).then((r) => r.json());
if (meta.detail) {
  console.error(meta.detail);
  process.exit(1);
}
console.log(
  `${meta.name} by ${meta.user?.username ?? "unknown"} · ${meta.faceCount} faces · ${meta.license?.fullName ?? "unknown license"}`,
);
const download = await fetch(
  `https://api.sketchfab.com/v3/models/${uid}/download`,
  { headers: { Authorization: `Token ${token}` } },
).then((r) => r.json());
const url = download.glb?.url ?? download.gltf?.url;
if (!url) {
  console.error("No downloadable GLB/GLTF URL. Is the account allowed to download this model?");
  process.exit(1);
}
const bin = Buffer.from(await fetch(url).then((r) => r.arrayBuffer()));
await import("node:fs/promises").then((fs) => fs.writeFile(out, bin));
console.log(`wrote ${out} (${bin.byteLength} bytes)`);
