import browser from "webextension-polyfill";

import type { ExtResponse, Message } from "./content/twitter.ts";
import { handleSubmit } from "./download/twitter.ts";

function createOption(idx: number): HTMLOptionElement {
  const element = document.createElement("option");
  element.value = idx.toString();
  element.textContent = (idx + 1).toString();
  return element;
}

async function search<T>(id: number): Promise<T | null> {
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
  let submit: (event: SubmitEvent) => void;
  switch (domain) {
    case "x":
      // biome-ignore lint/style/noNonNullAssertion: trust me bro
      response = await search<ExtResponse>(tab.id!);
      if (response === null || response.images.length < 1) {
        return;
      }
      submit = handleSubmit(response);
      break;
    default:
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

  form.addEventListener("submit", submit);
}

window.addEventListener("DOMContentLoaded", () =>
  main().then(() => {}, console.error),
);
