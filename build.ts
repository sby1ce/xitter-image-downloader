import { exec } from "node:child_process";
import { cp } from "node:fs/promises";

exec("vite build");
cp("dist", "build", { recursive: true });

console.log("Success");
