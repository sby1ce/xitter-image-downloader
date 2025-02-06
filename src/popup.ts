import browser from "webextension-polyfill";

import type { Message } from "./content/common.ts";
import type { DiscordResponse } from "./content/discord.ts";
import type { TwitterResponse } from "./content/twitter.ts";
import { checkDiscord, handleDiscord } from "./download/discord.ts";
import { checkTwitter, handleTwitter } from "./download/twitter.ts";

function createOption(idx: number): HTMLOptionElement {
  const element = document.createElement("option");
  element.value = idx.toString();
  element.textContent = (idx + 1).toString();
  return element;
}

function createAllOption(): HTMLOptionElement {
  const element = document.createElement("option");
  element.value = Number.NaN.toString();
  element.textContent = "All";
  return element;
}

async function search<T>(id: number): Promise<T | null> {
  try {
    const resp: T = await browser.tabs.sendMessage(id, {
      action: "getImages",
    } as Message);
    return resp;
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

  let optionsCount: number | null = null;
  let submit: (event: SubmitEvent) => void;
  // biome-ignore lint/style/noNonNullAssertion: trust me bro
  const id = tab.id!;
  switch (domain) {
    case "x": {
      const response = await search<TwitterResponse>(id);
      if (checkTwitter(response)) {
        return;
      }
      optionsCount = response.media.length;
      submit = handleTwitter(response);
      break;
    }
    case "discord": {
      const response = await search<DiscordResponse>(id);
      if (checkDiscord(response)) {
        return;
      }
      optionsCount = response.media.length;
      submit = handleDiscord(response);
      break;
    }
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
  select.append(
    ...Array(optionsCount).keys().map(createOption),
    createAllOption(),
  );

  form.addEventListener("submit", submit);
}

window.addEventListener("DOMContentLoaded", () =>
  main().then(() => {}, console.error),
);
