import { execFileSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const viteBin = path.resolve(root, "node_modules/.bin/vite");
const esbuildBin = path.resolve(root, "node_modules/.bin/esbuild");

// Build frontend with Vite
console.log("Building frontend…");
execFileSync(viteBin, ["build"], { cwd: root, stdio: "inherit" });

// Bundle server with esbuild
console.log("Building server…");
execFileSync(
  esbuildBin,
  [
    "server/index.ts",
    "--bundle",
    "--platform=node",
    "--format=cjs",
    "--outfile=dist/index.cjs",
    "--external:pg-native",
  ],
  { cwd: root, stdio: "inherit" },
);

console.log("✓ Build complete");
