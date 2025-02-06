import { execSync } from "node:child_process";
import { cp, rm } from "node:fs/promises";

await rm("build", { recursive: true, force: true });
execSync("vite build");
await cp("dist", "build", { recursive: true });

console.log("Success");
