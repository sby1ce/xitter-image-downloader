/*
Copyright 2025 sby1ce

SPDX-License-Identifier: AGPL-3.0-or-later
*/

import { execSync } from "node:child_process";
import { cp, rm } from "node:fs/promises";

const firefox: boolean = process.argv.includes("firefox");

if (firefox) {
  await rm("firefox", { recursive: true, force: true });
  execSync("vite build -- firefox");
  await cp("dist", "firefox", { recursive: true });
} else {
  await rm("build", { recursive: true, force: true });
  execSync("vite build");
  await cp("dist", "build", { recursive: true });
}

console.log("Success");
