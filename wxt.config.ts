/*
Copyright 2026 sby1ce

SPDX-License-Identifier: AGPL-3.0-or-later
*/

import { defineConfig } from "wxt";

export default defineConfig({
  srcDir: "src",
  imports: false,
  vite: () => ({
    css: {
      transformer: "lightningcss",
    },
    build: {
      cssMinify: "lightningcss",
    },
  }),
  manifest: {
    permissions: [
      "activeTab",
      "tabs",
      "scripting",
      "downloads",
      "declarativeNetRequestWithHostAccess",
    ],
    host_permissions: ["*://*.pximg.net/*", "*://*.bsky.app/*"],
    browser_specific_settings: {
      gecko: {
        id: "{20068cd5-8a24-4136-b697-8b1ad94fe57f}",
        data_collection_permissions: {
          required: ["none"],
        },
      },
    },
  },
});
