import browser, { type DeclarativeNetRequest } from "webextension-polyfill";

export interface BackgroundMessage {
  action: "fetch";
  url: string;
  filename: string;
}

export interface BackgroundResponse {
  data: string;
}

async function listen(
  request: unknown,
  _sender: browser.Runtime.MessageSender,
  // biome-ignore lint/suspicious/noExplicitAny: such are the types
  _sendResponse: any,
): Promise<void> {
  const message = request as BackgroundMessage;
  if (message.action !== "fetch") {
    return;
  }

  const response: Response = await fetch(message.url, {
    referrer: "https://www.pixiv.net/",
  });

  if (!response.ok) {
    console.error(await response.text());
    return;
  }
  const blob: Blob = await response.blob();

  const reader = new FileReader();
  const base64: string = await new Promise((resolve, reject) => {
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });

  const downloadId = await browser.downloads.download({
    url: base64,
    filename: message.filename,
    saveAs: true,
  });

  if (downloadId === undefined) {
    console.error(browser.runtime.lastError);
  }
}

browser.runtime.onMessage.addListener(listen);

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
    } as DeclarativeNetRequest.Rule,
  ];
  await browser.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: rules.map((r) => r.id),
    addRules: rules,
  });
}

browser.runtime.onInstalled.addListener(setDynamicRules);
