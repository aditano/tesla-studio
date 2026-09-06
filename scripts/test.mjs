import { build } from "esbuild";
import { mkdir } from "node:fs/promises";
await mkdir("node_modules/.cache", { recursive: true });
await build({
  entryPoints: ["tests/studio.test.ts"],
  outfile: "node_modules/.cache/studio-tests.mjs",
  bundle: true,
  platform: "node",
  format: "esm",
  packages: "external",
  define: { "import.meta.env.BASE_URL": JSON.stringify("/tesla-studio/") },
});
await import("../node_modules/.cache/studio-tests.mjs");
