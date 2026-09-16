import { cpSync, mkdirSync, readdirSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const outputDirectory = resolve(process.argv[2] || join(projectRoot, "dist"));
const publicEntries = ["index.html", "area-utilizador.html", "css", "js", "assets"];

if (outputDirectory === resolve(projectRoot)) {
  throw new Error("The build output must not be the project root.");
}

mkdirSync(outputDirectory, { recursive: true });
if (readdirSync(outputDirectory).length !== 0) {
  throw new Error("The build output directory must be empty to avoid publishing stale files.");
}

for (const entry of publicEntries) {
  cpSync(join(projectRoot, entry), join(outputDirectory, entry), { recursive: true });
}

console.log(`Static application copied to ${basename(outputDirectory)}. Internal documents and backend files are excluded.`);
