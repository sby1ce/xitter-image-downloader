/*
Copyright 2025 sby1ce

SPDX-License-Identifier: AGPL-3.0-or-later
*/

import browser from "webextension-polyfill";

import type { DiscordResponse, Media } from "../content/discord.ts";

function constructFilename(
  [original, ext]: [string, string],
  poster: string,
  date: string,
  index: number,
): string {
  // No `+ 1` here unlike twitter because user never sees the number
  // also discord can have up to 10 unlike twitter 4, so only 1 digit if it's the 10th
  return `${original}-@${poster}-${date}-${index}.${ext}`;
}

function extractOriginalFilename(src: string): [string, string] {
  const url = new URL(src);

  // biome-ignore lint/style/noNonNullAssertion: trust me bro
  const filename: string = url.pathname.split("/").pop()!;
  const dot = filename.lastIndexOf(".");
  const original = filename.slice(0, dot);
  const ext = filename.slice(dot + 1);
  return [original, ext];
}

async function downloadMedia(
  poster: string,
  date: string,
  media: Media,
  index: number,
): Promise<void> {
  const filename: string = constructFilename(
    extractOriginalFilename(media.src),
    poster,
    date,
    index,
  );

  const downloadId: number | undefined = await browser.downloads.download({
    url: media.src,
    filename,
    saveAs: true,
  });
  if (downloadId === undefined) {
    console.error(browser.runtime.lastError);
  }
}

async function download(
  event: SubmitEvent,
  data: DiscordResponse,
): Promise<void> {
  event.preventDefault();

  const date: string = data.date;
  const poster: string = data.poster;

  const form = event.target as HTMLFormElement;
  const body = new FormData(form);
  const index: number = Number.parseInt(body.get("selected") as string, 10);

  if (Number.isNaN(index)) {
    // All option selected
    for (let index = 0; index < data.media.length; index++) {
      const media: Media = data.media[index];
      await downloadMedia(poster, date, media, index);
    }
    return;
  }

  const media: Media = data.media[index];
  await downloadMedia(poster, date, media, index);
}

export function handleDiscord(
  data: DiscordResponse,
): (event: SubmitEvent) => void {
  return (event: SubmitEvent) =>
    download(event, data)
      .then(() => {}, console.error)
      .catch(console.error);
}

export function checkDiscord(
  response: DiscordResponse | null,
): response is null {
  return !response || response.media.length < 1;
}
