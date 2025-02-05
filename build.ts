import { cp } from "node:fs/promises";
import { exec } from "node:child_process";

exec("vite build");
cp("dist", "build", { recursive: true });

console.log("Success");
