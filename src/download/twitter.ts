import browser from "webextension-polyfill";

import type { Media, TwitterResponse } from "../content/twitter.ts";

function constructFilename(
  poster: string,
  id: string,
  timestamp: string,
  index: number,
  isImage: boolean,
): string {
  // Timestamp is in ISO format UTC+0 and we take only the date part
  const date = timestamp.split("T")[0];
  const ext = isImage ? "png" : "mp4";
  return `${poster}_${id}_${date}_${index + 1}.${ext}`;
}

async function download(
  event: SubmitEvent,
  data: TwitterResponse,
): Promise<void> {
  event.preventDefault();
  const form = event.target as HTMLFormElement;
  const body = new FormData(form);
  const index: number = Number.parseInt(body.get("selected") as string);
  const media: Media = data.media[index];
  const filename: string = constructFilename(
    data.poster,
    data.id,
    data.timestamp,
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
