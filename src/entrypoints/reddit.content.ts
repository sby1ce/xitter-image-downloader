/*
Copyright 2026 sby1ce

SPDX-License-Identifier: AGPL-3.0-or-later
*/

import { defineContentScript } from "#imports";
import type { Media, RedditResponse } from "@/common/reddit.ts";
import { messenger } from "@/messenger.ts";

interface DomQueries {
  media: string;
  poster: string;
  timestamp: string;
}

const queries: DomQueries = {
  media: "zoomable-img img, figure > img",
  poster: "faceplate-tracker > a[rpl][aria-haspopup]",
  timestamp: "span > faceplate-timeago > time",
};

function getUrl(element: HTMLImageElement): string | null {
  const src = element.src.trim();
  return src.length <= 0 ? null : src;
}

function transformUrl(src: string): Media {
  if (src.startsWith("https://i.redd.it/")) {
    return { src };
  }
  const path = new URL(src).pathname;
  const direct = `https://i.redd.it/${path.slice(path.lastIndexOf("-") + 1)}`;
  return { src: direct };
}

function findMedia(query: string): Media[] {
  const media: HTMLImageElement[] = Array.from(
    document.querySelectorAll(query),
  );
  const mediaData = media
    .map(getUrl)
    .filter((src): src is string => src !== null)
    .map(transformUrl);
  return mediaData;
}

function findPoster(query: string): string {
  const name: HTMLSpanElement | null = document.querySelector(query);
  if (!name?.textContent) {
    throw new Error("couldn't find name");
  }
  return name.textContent;
}

function findDate(query: string): string {
  const time: HTMLTimeElement | null = document.querySelector(query);
  if (!time?.dateTime) {
    throw new Error("couldn't find time");
  }
  // Timestamp is in ISO format UTC+0 and we take only the date part
  // biome-ignore lint/style/noNonNullAssertion: trust me bro
  return time.dateTime.split("T")[0]!;
}

function search(queries: DomQueries): [Media[], string, string] {
  return [
    findMedia(queries.media),
    findPoster(queries.poster),
    findDate(queries.timestamp),
  ];
}

export default defineContentScript({
  matches: ["*://www.reddit.com/*"],
  async main(): Promise<void> {
    messenger.onMessage("getImagesReddit", () => {
      const [media, poster, date] = search(queries);

      return {
        media,
        poster,
        date,
      } satisfies RedditResponse;
    });
  },
});
