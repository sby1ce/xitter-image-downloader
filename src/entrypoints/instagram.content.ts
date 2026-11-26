/*
Copyright 2026 sby1ce

SPDX-License-Identifier: AGPL-3.0-or-later
*/

import { defineContentScript } from "#imports";
import type { InstagramResponse, Media } from "@/common/instagram.ts";
import { messenger } from "@/messenger.ts";

interface DomQueries {
  media: string;
  nextButton: string;
  poster: string;
  timestamp: string;
}

// I think I am not going to bother with videos
// they are served with <video src="blob:https://..">
// as m3u8 playlists
//
// also account for posts opened in a new tab
const queries: DomQueries = {
  // instagram unloads from dom not-adjacent images
  // case 1 - query returns exactly 1 image - single image post
  // case 2 - query returns exactly 2 images - we're either at the beginning or the end of a carousel
  // case 3 - query returns exactly 3 images - we're in the middle of a carousel
  media:
    "article div > img[alt]:not([aria-hidden]), " +
    'div[tabindex="-1"] div > img[alt]:not([aria-hidden])',
  // only used in the dispute when media returns exactly 2 images
  nextButton:
    'article button[tabindex][aria-label="Next"], ' +
    'div[tabindex="-1"] button[tabindex][aria-label="Next"]',
  // just pick the first one because it's too much effort
  poster:
    "article header a > div > span[dir]:not(:has(*)), a > div > div > span[dir]:not(:has(*))",
  timestamp: "a > span > time",
};

function findMedia(queries: DomQueries): Media[] {
  const media: HTMLImageElement[] = Array.from(
    document.querySelectorAll(queries.media),
  );
  switch (media.length) {
    case 1:
      return [
        {
          // biome-ignore lint/style/noNonNullAssertion: trust me bro
          src: media[0]!.src,
        } satisfies Media,
      ];
    case 2: {
      const first = Boolean(document.querySelector(queries.nextButton));
      return [
        {
          // biome-ignore lint/style/noNonNullAssertion: trust me bro
          src: media[first ? 0 : 1]!.src,
        } satisfies Media,
      ];
    }
    case 3:
      return [
        {
          // biome-ignore lint/style/noNonNullAssertion: trust me bro
          src: media[1]!.src,
        } satisfies Media,
      ];
  }
  return media.map((el) => ({ src: el.src }));
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

function parseUrlId(): string {
  // biome-ignore lint/style/noNonNullAssertion: trust me bro
  return window.location.pathname
    .split("/")
    .findLast((slug) => slug.length > 0)!;
}

function search(queries: DomQueries): [Media[], string, string] {
  return [
    findMedia(queries),
    findPoster(queries.poster),
    findDate(queries.timestamp),
  ];
}

export default defineContentScript({
  matches: ["*://*.instagram.com/*"],
  async main(): Promise<void> {
    messenger.onMessage("getImagesInstagram", () => {
      const [media, poster, date] = search(queries);

      return {
        media,
        poster,
        date,
        id: parseUrlId(),
      } satisfies InstagramResponse;
    });
  },
});
