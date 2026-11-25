/*
Copyright 2026 sby1ce

SPDX-License-Identifier: AGPL-3.0-or-later
*/

import { defineContentScript } from "#imports";
import type { Media, PixivResponse } from "@/common/pixiv.ts";
import { messenger } from "@/messenger";

interface DomQueries {
  media: string;
  poster: string;
  timestamp: string;
}

const queries: DomQueries = {
  media: "main a:has(> img)",
  // 2 places poster name appears and both are supposed to be the same
  poster: "a + div > a > div",
  timestamp: "time",
};

function transformUrl(element: HTMLAnchorElement): Media {
  return {
    src: element.href,
  };
}

function findMedia(query: string): Media[] {
  const media: HTMLAnchorElement[] = Array.from(
    document.querySelectorAll(query),
  );
  const mediaData = media.map(transformUrl);
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
  matches: ["*://www.pixiv.net/*"],
  async main(): Promise<void> {
    messenger.onMessage("getImagesPixiv", () => {
      const [media, poster, date] = search(queries);

      return {
        media,
        poster,
        date,
      } satisfies PixivResponse;
    });
  },
});
