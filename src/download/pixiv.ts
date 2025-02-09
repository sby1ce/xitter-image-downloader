/*
Copyright 2025 sby1ce

SPDX-License-Identifier: AGPL-3.0-or-later
*/

import browser from "webextension-polyfill";

import type { PixivResponse, Media } from "../content/pixiv.ts";

function constructFilename(
  original: string,
  poster: string,
  date: string,
): string {
  // original filename by pixiv has id, index and the extension
  return `${poster}-${date}-${original}`;
}

/**
 * @param src full URL
 * @returns a string with the id, index and file extension
 */
function extractId(src: string): string {
  // biome-ignore lint/style/noNonNullAssertion: trust me bro
  const filename: string = src.split("/").pop()!;
  return filename;
}

async function downloadMedia(
  poster: string,
  date: string,
  media: Media,
): Promise<void> {
  const filename: string = constructFilename(
    extractId(media.src),
    poster,
    date,
  );

  // pixiv restricts access with a `Referer` header
  // even though Firefox 70+ allows it in download API, Chrome doesn't, so have to make this crutch
  // of downloading with fetch into blob and then downloading the blob
  const blob: Blob = await fetch(media.src, {
    method: "GET",
    referrer: "https://www.pixiv.net/",
  }).then(resp => resp.blob());
  const url = URL.createObjectURL(blob);

  const downloadId: number | undefined = await browser.downloads.download({
    url,
    filename,
    saveAs: true,
  });

  URL.revokeObjectURL(url);
  
  if (downloadId === undefined) {
    console.error(browser.runtime.lastError);
  }
}

async function download(
  event: SubmitEvent,
  data: PixivResponse,
): Promise<void> {
  event.preventDefault();

  const date: string = data.date;
  const poster: string = data.poster;

  const form = event.target as HTMLFormElement;
  const body = new FormData(form);
  const index: number = Number.parseInt(body.get("selected") as string);

  if (Number.isNaN(index)) {
    // All option selected
    for (const media of data.media) {
      await downloadMedia(poster, date, media);
    }
    return;
  }

  const media: Media = data.media[index];
  await downloadMedia(poster, date, media);
}

export function handlePixiv(
  data: PixivResponse,
): (event: SubmitEvent) => void {
  return (event: SubmitEvent) =>
    download(event, data)
      .then(() => {}, console.error)
      .catch(console.error);
}

export function checkPixiv(
  response: PixivResponse | null,
): response is null {
  return !response || response.media.length < 1;
}
