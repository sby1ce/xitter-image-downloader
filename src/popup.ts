import browser from "webextension-polyfill";

import type { ExtResponse, Message } from "./content.ts";

function constructFilename(poster: string): string {
  return `${poster}_.png`;
}

async function download(event: SubmitEvent): Promise<void> {
  event.preventDefault();
  const form = event.target as HTMLFormElement;
  const data = new FormData(form);
  const url = data.get("selected") as string;
  const poster = data.get("poster") as string;
  const filename = constructFilename(poster);
  const downloadId: number | undefined = await browser.downloads.download({
    url,
    filename,
    saveAs: true,
  });
  if (downloadId === undefined) {
    console.error(browser.runtime.lastError);
  }
}

function createOption(value: string, idx: number): HTMLOptionElement {
  const element = document.createElement("option");
  element.value = value;
  element.textContent = idx.toString();
  return element;
}

async function main(): Promise<void> {
  const tabs = await browser.tabs.query({ active: true, currentWindow: true });
  let response: ExtResponse;
  try {
    // biome-ignore lint/style/noNonNullAssertion: trust me bro
    response = await browser.tabs.sendMessage(tabs[0].id!, {
      action: "getImages",
    } as Message);
  } catch (e) {
    console.warn(e);
    return;
  }
  const options = response.images;

  // biome-ignore lint/style/noNonNullAssertion: trust me bro
  const select = document.querySelector("select")!;
  select.append(...options.map(createOption));
  // biome-ignore lint/style/noNonNullAssertion: trust me bro
  const poster: HTMLInputElement = document.querySelector(
    'input[name="poster"]',
  )!;
  poster.value = response.poster;
  // biome-ignore lint/style/noNonNullAssertion: trust me bro
  const form = document.querySelector("form")!;
  form.addEventListener("submit", download);
}

window.addEventListener("DOMContentLoaded", () =>
  main().then(() => {}, console.error),
);
