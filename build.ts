import { exec } from "node:child_process";
import { cp, rm } from "node:fs/promises";

exec("vite build");
await rm("build", { recursive: true });
await cp("dist", "build", { recursive: true });

console.log("Success");
