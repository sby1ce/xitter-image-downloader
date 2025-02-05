import browser from "webextension-polyfill";

import type { ExtResponse, Message } from "./content.ts";

function constructFilename(
  poster: string,
  id: string,
  timestamp: string,
  index: number,
): string {
  // Timestamp is in ISO format UTC+0 and we take only the date part
  const date = timestamp.split("T")[0];
  return `${poster}_${id}_${date}_${index + 1}.png`;
}

async function download(event: SubmitEvent): Promise<void> {
  event.preventDefault();
  const form = event.target as HTMLFormElement;
  const body = new FormData(form);
  const index: number = Number.parseInt(body.get("selected") as string);
  const data: ExtResponse = JSON.parse(body.get("data") as string);
  const url: string = data.images[index];
  const filename: string = constructFilename(
    data.poster,
    data.id,
    data.timestamp,
    index,
  );
  const downloadId: number | undefined = await browser.downloads.download({
    url,
    filename,
    saveAs: true,
  });
  if (downloadId === undefined) {
    console.error(browser.runtime.lastError);
  }
}

function createOption(idx: number): HTMLOptionElement {
  const element = document.createElement("option");
  element.value = idx.toString();
  element.textContent = (idx + 1).toString();
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
  select.append(...options.keys().map(createOption));
  // biome-ignore lint/style/noNonNullAssertion: trust me bro
  const data: HTMLInputElement = document.querySelector('input[name="data"]')!;
  data.value = JSON.stringify(response);
  // biome-ignore lint/style/noNonNullAssertion: trust me bro
  const form = document.querySelector("form")!;
  form.addEventListener("submit", download);
}

window.addEventListener("DOMContentLoaded", () =>
  main().then(() => {}, console.error),
);
