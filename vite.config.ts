/*
Copyright 2025 sby1ce

SPDX-License-Identifier: CC0-1.0
*/

import { defineConfig } from "vite";
import webExtension, { readJsonFile } from "vite-plugin-web-extension";

const browser = process.argv.includes("firefox") ? "firefox" : "chrome";

function generateManifest() {
  const manifest = readJsonFile("src/manifest.json");
  const pkg = readJsonFile("package.json");
  return {
    name: pkg.name,
    description: pkg.description,
    version: pkg.version,
    ...manifest,
  };
}

export default defineConfig({
  plugins: [
    webExtension({
      manifest: generateManifest,
      watchFilePaths: ["package.json", "manifest.json"],
      browser,
    }),
  ],
  css: {
    transformer: "lightningcss",
  },
  build: {
    cssMinify: "lightningcss",
  },
});
