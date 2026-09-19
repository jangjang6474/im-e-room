import { build } from "esbuild";
import { rm } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const entryName = process.argv[2];
if (!entryName || !/^[a-z-]+\.ts$/.test(entryName)) {
  throw new Error("Usage: node scripts/data/run.mjs <data-script.ts>");
}

const entry = path.resolve("scripts", "data", entryName);
const output = path.resolve("node_modules", ".cache", `im-e-room-${entryName}.mjs`);
await build({ entryPoints: [entry], outfile: output, bundle: true, platform: "node", format: "esm", sourcemap: "inline" });
try {
  await import(`${pathToFileURL(output).href}?run=${Date.now()}`);
} finally {
  await rm(output, { force: true });
}
