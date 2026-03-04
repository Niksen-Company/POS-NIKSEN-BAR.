import { execSync } from "child_process";
import fs from "fs";
import path from "path";

const __dirname = path.dirname(new URL(import.meta.url).pathname);
const root = path.resolve(__dirname, "..");

// Build frontend with Vite
console.log("Building frontend…");
execSync("npx vite build", { cwd: root, stdio: "inherit" });

// Bundle server with esbuild
console.log("Building server…");
execSync(
  `npx esbuild server/index.ts --bundle --platform=node --format=cjs --outfile=dist/index.cjs --external:pg-native`,
  { cwd: root, stdio: "inherit" }
);

console.log("✓ Build complete");
