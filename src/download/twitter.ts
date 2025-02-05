import browser from "webextension-polyfill";

import type { ExtResponse } from "../content/twitter.ts";

function constructFilename(
  poster: string,
  id: string,
  timestamp: string,
  index: number,
): string {
  // Timestamp is in ISO format UTC+0 and we take only the date part
  const date = timestamp.split("T")[0];
  return `${poster}_${id}_${date}_${index + 1}.png`;
}

async function download(event: SubmitEvent, data: ExtResponse): Promise<void> {
  event.preventDefault();
  const form = event.target as HTMLFormElement;
  const body = new FormData(form);
  const index: number = Number.parseInt(body.get("selected") as string);
  const url: string = data.images[index];
  const filename: string = constructFilename(
    data.poster,
    data.id,
    data.timestamp,
    index,
  );
  const downloadId: number | undefined = await browser.downloads.download({
    url,
    filename,
    saveAs: true,
  });
  if (downloadId === undefined) {
    console.error(browser.runtime.lastError);
  }
}

export function handleSubmit(data: ExtResponse): (event: SubmitEvent) => void {
  return (event: SubmitEvent) =>
    download(event, data).then(() => {}, console.error);
}
