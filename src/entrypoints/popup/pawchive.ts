/*
Copyright 2026 sby1ce

SPDX-License-Identifier: AGPL-3.0-or-later
*/

import { browser } from "#imports";
import type { Media, PawchiveResponse } from "@/common/pawchive.ts";

interface FilenameComponents {
  original: string;
  poster: string;
  posterId: string;
  platform: string;
  id: string;
  date: string;
  index: number;
  ext: string;
}

function constructFilename({
  original,
  poster,
  posterId,
  platform,
  id,
  date,
  index,
  ext,
}: FilenameComponents): string {
  return `${original}-${poster}-${posterId}-${platform}-${id}-${date}-${index}.${ext}`;
}

async function downloadMedia(
  components: FilenameComponents,
  src: string,
): Promise<void> {
  const filename: string = constructFilename(components);

  const downloadId: number | undefined = await browser.downloads.download({
    url: src,
    filename,
    saveAs: true,
  });
  if (downloadId === undefined) {
    console.error(browser.runtime.lastError);
  }
}

async function download(
  event: SubmitEvent,
  data: PawchiveResponse,
): Promise<void> {
  event.preventDefault();

  const date: string = data.date;
  const poster: string = data.poster;
  const posterId: string = data.posterId;
  const platform: string = data.platform;
  const id: string = data.id;

  const form = event.target as HTMLFormElement;
  const body = new FormData(form);
  const index: number = Number.parseInt(body.get("selected") as string, 10);

  if (Number.isNaN(index)) {
    // All option selected
    for (let index = 0; index < data.media.length; index++) {
      // biome-ignore lint/style/noNonNullAssertion: trust me bro
      const media: Media = data.media[index]!;
      await downloadMedia(
        {
          original: media.filestem,
          poster,
          posterId,
          platform,
          id,
          date,
          index,
          ext: media.ext,
        } satisfies FilenameComponents,
        media.src,
      );
    }
    return;
  }

  // biome-ignore lint/style/noNonNullAssertion: trust me bro
  const media: Media = data.media[index]!;
  await downloadMedia(
    {
      original: media.filestem,
      poster,
      posterId,
      platform,
      id,
      date,
      index,
      ext: media.ext,
    } satisfies FilenameComponents,
    media.src,
  );
}

export function handlePawchive(
  data: PawchiveResponse,
): (event: SubmitEvent) => void {
  return (event: SubmitEvent) =>
    download(event, data)
      .then(() => {}, console.error)
      .catch(console.error);
}

export function checkPawchive(
  response: PawchiveResponse | null,
): response is null {
  return !response || response.media.length < 1;
}
