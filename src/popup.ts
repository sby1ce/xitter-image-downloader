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

async function download(event: SubmitEvent, data: ExtResponse): Promise<void> {
  event.preventDefault();
  const form = event.target as HTMLFormElement;
  const body = new FormData(form);
  const index: number = Number.parseInt(body.get("selected") as string);
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

function handleSubmit(data: ExtResponse): (event: SubmitEvent) => void {
  return (event: SubmitEvent) => download(event, data).then(() => {}, console.error);
}

function createOption(idx: number): HTMLOptionElement {
  const element = document.createElement("option");
  element.value = idx.toString();
  element.textContent = (idx + 1).toString();
  return element;
}

async function searchTwitter(id: number): Promise<ExtResponse | null> {
  try {
    return await browser.tabs.sendMessage(id, {
      action: "getImages",
    } as Message);
  } catch (e) {
    console.warn(e);
    return null;
  }
}

async function main(): Promise<void> {
  const tab: browser.Tabs.Tab = (
    await browser.tabs.query({ active: true, currentWindow: true })
  )[0];
  const host = new URL(tab.url ?? "").host.split(".");
  const tld = host.at(-1);
  const domain = host.at(-2);
  if (tld !== "com" || !domain) {
    return;
  }

  let response: ExtResponse | null = null;
  switch (domain) {
    case "x":
      // biome-ignore lint/style/noNonNullAssertion: trust me bro
      response = await searchTwitter(tab.id!);
      if (response === null) {
        return;
      }
      break;
    default:
      return;
  }

  if (response.images.length < 1) {
    return;
  }

  // biome-ignore lint/style/noNonNullAssertion: trust me bro
  const form = document.querySelector("form")!;
  // biome-ignore lint/style/noNonNullAssertion: trust me bro
  const notice = document.querySelector("section")!;
  form.classList.remove("hidden");
  notice.classList.add("hidden");

  // biome-ignore lint/style/noNonNullAssertion: trust me bro
  const select = document.querySelector("select")!;
  select.append(...response.images.keys().map(createOption));
  
  form.addEventListener("submit", handleSubmit(response));
}

window.addEventListener("DOMContentLoaded", () =>
  main().then(() => {}, console.error),
);
