/*
Copyright 2025 sby1ce

SPDX-License-Identifier: AGPL-3.0-or-later
*/

import browser from "webextension-polyfill";

import type { Message } from "./common.ts";

export interface Media {
  src: string;
}

export interface PixivResponse {
  // The id alongside index is in the src string
  media: Media[];
  poster: string;
  date: string;
}

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
  if (!name || !name.textContent) {
    throw new Error("couldn't find name");
  }
  return name.textContent;
}

function findDate(query: string): string {
  const time: HTMLTimeElement | null = document.querySelector(query);
  if (!time || !time.dateTime) {
    throw new Error("couldn't find time");
  }
  // Timestamp is in ISO format UTC+0 and we take only the date part
  return time.dateTime.split("T")[0];
}

function search(queries: DomQueries): [Media[], string, string] {
  return [
    findMedia(queries.media),
    findPoster(queries.poster),
    findDate(queries.timestamp),
  ];
}

function listen(
  message: unknown,
  _sender: browser.Runtime.MessageSender,
  // biome-ignore lint/suspicious/noExplicitAny: such are the types
  sendResponse: any,
): undefined {
  if ((message as Message).action !== "getImages") {
    return;
  }
  const [media, poster, date] = search(queries);

  sendResponse({
    media,
    poster,
    date,
  } satisfies PixivResponse);
}

// @ts-expect-error you only need to return `true` from listener that sends response when the response is sent asynchronously
browser.runtime.onMessage.addListener(listen);
