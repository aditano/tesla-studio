/** Headed Chrome stills of the scenic backdrops. Requires `playwright` and DISPLAY.
 *   STUDIO_URL=http://127.0.0.1:5173/ node scripts/capture-stills.mjs
 */
import { chromium } from "playwright";
import fs from "node:fs/promises";

const base = process.env.STUDIO_URL ?? "http://127.0.0.1:5173/";
const outDir = process.env.STILL_DIR ?? "/opt/cursor/artifacts/stills";
await fs.mkdir(outDir, { recursive: true });

const browser = await chromium.launch({
  channel: "chrome",
  headless: false,
  args: ["--ignore-gpu-blocklist", "--enable-webgl", "--disable-dev-shm-usage"],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.on("pageerror", (err) => console.error("PAGE", err.message));
await page.goto(base, { waitUntil: "domcontentloaded" });
await page.waitForSelector("canvas", { timeout: 30000 });

async function settle() {
  await page.waitForFunction(() => !document.querySelector(".scene-loading"), null, {
    timeout: 30000,
  });
  await page.waitForTimeout(1600);
}

async function pickModel(name) {
  await page.getByRole("button", { name: new RegExp(name, "i") }).first().click({ force: true });
  await settle();
}

async function pickBackdrop(label) {
  await page.getByRole("button", { name: label, exact: true }).click({ force: true });
  await settle();
}

const shots = [
  ["cybertruck", "Cybertruck", "Forest"],
  ["cybertruck", "Cybertruck", "Mars"],
  ["cybertruck", "Cybertruck", "Desert"],
  ["cybertruck", "Cybertruck", "Night city"],
  ["cybercab", "Cybercab", "Forest"],
  ["cybercab", "Cybercab", "Mars"],
  ["cybercab", "Cybercab", "Desert"],
  ["cybercab", "Cybercab", "Night city"],
];

for (const [id, model, backdrop] of shots) {
  await pickModel(model);
  await pickBackdrop(backdrop);
  const file = `${outDir}/${id}-${backdrop.toLowerCase().replace(" ", "-")}.png`;
  await page.screenshot({ path: file, timeout: 20000 });
  console.log("wrote", file);
}

await page.getByRole("button", { name: "Help and credits" }).click({ force: true });
await page.waitForSelector(".help-modal");
const help = await page.locator(".help-modal").innerText();
for (const phrase of ["Nieve5677", "CC BY 4.0", "zwir3kk", "not endorsed by Tesla"]) {
  if (!help.includes(phrase)) throw new Error(`Missing credit phrase: ${phrase}`);
}
await page.screenshot({ path: `${outDir}/credits-dialog.png`, timeout: 20000 });
console.log("credits ok");
await browser.close();
