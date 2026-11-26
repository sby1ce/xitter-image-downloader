/*
Copyright 2026 sby1ce

SPDX-License-Identifier: AGPL-3.0-or-later
*/

import { browser } from "#imports";
import type { InstagramResponse, Media } from "@/common/instagram.ts";

function constructFilename(poster: string, id: string, date: string): string {
  return `@${poster}-${id}-${date}-.jpg`;
}

async function downloadMedia(
  poster: string,
  id: string,
  date: string,
  media: Media,
): Promise<void> {
  const filename: string = constructFilename(poster, id, date);

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
  data: InstagramResponse,
): Promise<void> {
  event.preventDefault();

  const date: string = data.date;
  const poster: string = data.poster;
  const id: string = data.id;

  const form = event.target as HTMLFormElement;
  const body = new FormData(form);
  const index: number = Number.parseInt(body.get("selected") as string, 10);

  if (Number.isNaN(index)) {
    // All option selected
    for (let index = 0; index < data.media.length; index++) {
      // biome-ignore lint/style/noNonNullAssertion: trust me bro
      const media: Media = data.media[index]!;
      await downloadMedia(poster, id, date, media);
    }
    return;
  }

  // biome-ignore lint/style/noNonNullAssertion: trust me bro
  const media: Media = data.media[index]!;
  await downloadMedia(poster, id, date, media);
}

export function handleInstagram(
  data: InstagramResponse,
): (event: SubmitEvent) => void {
  return (event: SubmitEvent) =>
    download(event, data)
      .then(() => {}, console.error)
      .catch(console.error);
}

export function checkInstagram(
  response: InstagramResponse | null,
): response is null {
  return !response || response.media.length < 1;
}
