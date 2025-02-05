import browser from "webextension-polyfill";

import type { Media, TwitterResponse } from "../content/twitter.ts";

function constructFilename(
  poster: string,
  id: string,
  date: string,
  index: number,
  isImage: boolean,
): string {
  // Timestamp is in ISO format UTC+0 and we take only the date part
  const ext = isImage ? "png" : "mp4";
  return `${poster}_${id}_${date}_${index + 1}.${ext}`;
}

async function downloadMedia(
  poster: string,
  id: string,
  date: string,
  media: Media,
  index: number,
): Promise<void> {
  const filename: string = constructFilename(
    poster,
    id,
    date,
    index,
    media.image,
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
  data: TwitterResponse,
): Promise<void> {
  event.preventDefault();

  const date: string = data.timestamp.split("T")[0];
  const poster: string = data.poster;
  const id: string = data.id;

  const form = event.target as HTMLFormElement;
  const body = new FormData(form);
  const index: number = Number.parseInt(body.get("selected") as string);

  if (Number.isNaN(index)) {
    // All option selected
    for (let index = 0; index < data.media.length; index++) {
      const media: Media = data.media[index];
      await downloadMedia(poster, id, date, media, index);
    }
    return;
  }

  const media: Media = data.media[index];
  await downloadMedia(poster, id, date, media, index);
}

export function handleSubmit(
  data: TwitterResponse,
): (event: SubmitEvent) => void {
  return (event: SubmitEvent) =>
    download(event, data).then(() => {}, console.error);
}

export function checkTwitter(
  response: TwitterResponse | null,
): response is null {
  return !response || response.media.length < 1;
}
