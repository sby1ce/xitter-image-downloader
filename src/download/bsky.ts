/*
Copyright 2026 sby1ce

SPDX-License-Identifier: AGPL-3.0-or-later
*/

import browser from "webextension-polyfill";

import type { BskyResponse, Media } from "../content/bsky.ts";

function resolveUrl(base: string, relative: string): string {
  return new URL(relative, base).toString();
}

async function parsePlaylist(playlistUrl: string): Promise<string[]> {
  const resp = await fetch(playlistUrl);
  if (!resp.ok) {
    throw new Error(`Failed to fetch playlist: ${resp.status}`);
  }
  const text = await resp.text();

  if (text.includes("#EXT-X-STREAM-INF")) {
    const lines = text.split("\n");
    let bestUrl: string | null = null;
    let bestBandwidth = -1;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith("#EXT-X-STREAM-INF:")) {
        const bandwidthMatch = line.match(/BANDWIDTH=(\d+)/);
        const bandwidth = bandwidthMatch
          ? Number.parseInt(bandwidthMatch[1], 10)
          : 0;
        for (let j = i + 1; j < lines.length; j++) {
          const next = lines[j].trim();
          if (next.length > 0 && !next.startsWith("#")) {
            if (bandwidth > bestBandwidth) {
              bestBandwidth = bandwidth;
              bestUrl = resolveUrl(playlistUrl, next);
            }
            break;
          }
        }
      }
    }

    if (!bestUrl) {
      throw new Error("No stream found in master playlist");
    }
    return parsePlaylist(bestUrl);
  }

  const lines = text.split("\n");
  const segments: string[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.length > 0 && !trimmed.startsWith("#")) {
      segments.push(resolveUrl(playlistUrl, trimmed));
    }
  }

  if (segments.length === 0) {
    throw new Error("No segments found in media playlist");
  }
  return segments;
}

/** Don't blame this on me, blame this on bluesky and refusing to have an mp4 download */
async function downloadAndConcatVideo(
  playlistUrl: string,
  filename: string,
): Promise<void> {
  const segmentUrls = await parsePlaylist(playlistUrl);

  const buffers: ArrayBuffer[] = await Promise.all(
    segmentUrls.map(async (url) => {
      const resp = await fetch(url);
      if (!resp.ok) {
        throw new Error(`Failed to fetch segment: ${resp.status} for ${url}`);
      }
      return resp.arrayBuffer();
    }),
  );

  const totalLength = buffers.reduce((acc, buf) => acc + buf.byteLength, 0);
  const combined = new Uint8Array(totalLength);
  let offset = 0;
  for (const buf of buffers) {
    combined.set(new Uint8Array(buf), offset);
    offset += buf.byteLength;
  }

  const blob = new Blob([combined], { type: "video/MP2T" });
  const objectUrl = URL.createObjectURL(blob);

  try {
    const downloadId = await browser.downloads.download({
      url: objectUrl,
      filename,
      saveAs: true,
    });
    if (downloadId === undefined) {
      console.error(browser.runtime.lastError);
    }
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function constructFilename(
  poster: string,
  id: string,
  date: string,
  index: number,
  ext: string,
): string {
  return `${poster}-${id}-${date}-${index + 1}.${ext}`;
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
    media.ext,
  );

  if (media.ext === "ts") {
    await downloadAndConcatVideo(media.src, filename);
    return;
  }

  const downloadId: number | undefined = await browser.downloads.download({
    url: media.src,
    filename,
    saveAs: true,
  });
  if (downloadId === undefined) {
    console.error(browser.runtime.lastError);
  }
}

async function download(event: SubmitEvent, data: BskyResponse): Promise<void> {
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
      const media: Media = data.media[index];
      await downloadMedia(poster, id, date, media, index);
    }
    return;
  }

  const media: Media = data.media[index];
  await downloadMedia(poster, id, date, media, index);
}

export function handleBsky(data: BskyResponse): (event: SubmitEvent) => void {
  return (event: SubmitEvent) =>
    download(event, data)
      .then(() => {}, console.error)
      .catch(console.error);
}

export function checkBsky(response: BskyResponse | null): response is null {
  return !response || response.media.length < 1;
}
