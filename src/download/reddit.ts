/*
Copyright 2025 sby1ce

SPDX-License-Identifier: AGPL-3.0-or-later
*/

import browser from "webextension-polyfill";

import type { Media, RedditResponse } from "../content/reddit.ts";

function constructFilename(
  ext: string,
  poster: string,
  date: string,
  index: number,
): string {
  return `${poster}-${date}-${index}.${ext}`;
}

function extractExt(src: string): string {
  const url = new URL(src);

  // biome-ignore lint/style/noNonNullAssertion: trust me bro
  const filename: string = url.pathname.split("/").pop()!;
  const dot = filename.lastIndexOf(".");
  return filename.slice(dot + 1);
}

async function downloadMedia(
  poster: string,
  date: string,
  media: Media,
  index: number,
): Promise<void> {
  const filename: string = constructFilename(
    extractExt(media.src),
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
  data: RedditResponse,
): Promise<void> {
  event.preventDefault();

  const date: string = data.date;
  const poster: string = data.poster;

  const form = event.target as HTMLFormElement;
  const body = new FormData(form);
  const index: number = Number.parseInt(body.get("selected") as string);

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

export function handleReddit(
  data: RedditResponse,
): (event: SubmitEvent) => void {
  return (event: SubmitEvent) =>
    download(event, data)
      .then(() => {}, console.error)
      .catch(console.error);
}

export function checkReddit(response: RedditResponse | null): response is null {
  return !response || response.media.length < 1;
}
