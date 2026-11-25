/*
Copyright 2026 sby1ce

SPDX-License-Identifier: AGPL-3.0-or-later
*/

import { type Browser, browser } from "#imports";
import type { BskyResponse } from "@/common/bsky.ts";
import type { DiscordResponse } from "@/common/discord.ts";
import type { PixivResponse } from "@/common/pixiv.ts";
import type { RedditResponse } from "@/common/reddit.ts";
import type { TwitterResponse } from "@/common/twitter.ts";
import { messenger } from "@/messenger.ts";
import { checkBsky, fetchBskyPost, handleBsky } from "./bsky.ts";
import { checkDiscord, handleDiscord } from "./discord.ts";
import { checkPixiv, handlePixiv } from "./pixiv.ts";
import { checkReddit, handleReddit } from "./reddit.ts";
import { checkTwitter, handleTwitter } from "./twitter.ts";

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

async function main(): Promise<void> {
  // biome-ignore lint/style/noNonNullAssertion: trust me bro
  const tab: Browser.tabs.Tab = (
    await browser.tabs.query({ active: true, currentWindow: true })
  )[0]!;
  const host = new URL(tab.url ?? "").host;

  let optionsCount: number | null = null;
  let submit: (event: SubmitEvent) => void;
  // biome-ignore lint/style/noNonNullAssertion: trust me bro
  const id = tab.id!;
  switch (host) {
    case "x.com": {
      const response: TwitterResponse = await messenger.sendMessage(
        "getImagesTwitter",
        undefined,
        id,
      );
      if (checkTwitter(response)) {
        return;
      }
      optionsCount = response.media.length;
      submit = handleTwitter(response);
      break;
    }
    case "discord.com": {
      const response: DiscordResponse = await messenger.sendMessage(
        "getImagesDiscord",
        undefined,
        id,
      );
      if (checkDiscord(response)) {
        return;
      }
      optionsCount = response.media.length;
      submit = handleDiscord(response);
      break;
    }
    case "www.pixiv.net": {
      const response: PixivResponse = await messenger.sendMessage(
        "getImagesPixiv",
        undefined,
        id,
      );
      if (checkPixiv(response)) {
        return;
      }
      optionsCount = response.media.length;
      submit = handlePixiv(response);
      break;
    }
    case "www.reddit.com": {
      const response: RedditResponse = await messenger.sendMessage(
        "getImagesReddit",
        undefined,
        id,
      );
      if (checkReddit(response)) {
        return;
      }
      optionsCount = response.media.length;
      submit = handleReddit(response);
      break;
    }
    case "bsky.app": {
      // biome-ignore lint/style/noNonNullAssertion: trust me bro
      const response: BskyResponse | null = await fetchBskyPost(tab.url!);
      if (checkBsky(response)) {
        return;
      }
      optionsCount = response.media.length;
      submit = handleBsky(response);
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
