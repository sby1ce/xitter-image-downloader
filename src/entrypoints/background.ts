/*
Copyright 2026 sby1ce

SPDX-License-Identifier: AGPL-3.0-or-later
*/

import { type Browser, browser, defineBackground } from "#imports";
import { messenger } from "../messenger.ts";

export default defineBackground({
  main(): void {
    messenger.onMessage("pixiv", async ({ data: { imageUrl, filename } }) => {
      const response: Response = await fetch(imageUrl, {
        referrer: "https://www.pixiv.net/",
      });

      if (!response.ok) {
        console.error(await response.text());
        return;
      }
      const blob: Blob = await response.blob();

      const objectUrl = URL.createObjectURL(blob);

      try {
        const downloadId = await browser.downloads.download({
          url: objectUrl,
          filename,
          saveAs: true,
        });

        if (downloadId === undefined) {
          console.error(browser.runtime.lastError);
        }
      } finally {
        // Surely this is fine and i won't be dealing with files large enough to matter
        // to switch to download.onChange event listener or something
        setTimeout(() => URL.revokeObjectURL(objectUrl), 10000);
      }
    });

    async function setDynamicRules(): Promise<void> {
      const rules = [
        {
          id: 1,
          action: {
            type: "modifyHeaders",
            requestHeaders: [
              {
                header: "Referer",
                operation: "set",
                value: "https://www.pixiv.net/",
              },
            ],
          },
          condition: {
            domains: [browser.runtime.id],
            urlFilter: "|*://*.pximg.net/*",
            resourceTypes: ["xmlhttprequest"],
          },
        } satisfies Browser.declarativeNetRequest.Rule,
      ];
      await browser.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: rules.map((r) => r.id),
        addRules: rules,
      });
    }

    browser.runtime.onInstalled.addListener(setDynamicRules);
  },
});
