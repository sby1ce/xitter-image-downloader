/*
Copyright 2025 sby1ce

SPDX-License-Identifier: AGPL-3.0-or-later
*/

import browser from "webextension-polyfill";

import type { Message } from "./common.ts";

export interface Media {
  src: string;
  ext: string;
}

export interface TwitterResponse {
  media: Media[];
  poster: string;
  date: string;
  id: string;
}

interface DomQueries {
  media: string;
  poster: string;
  timestamp: string;
}

// Selects the main post using the reply section as the indicator
// :not([alt=""]) excludes profile pictures (it turns out people can set alt text on images??)
// also capture GIFs (actually mp4)
const logged: DomQueries = {
  media:
    'article:has(+ div[data-testid="inline_reply_offscreen"]) img[draggable="true"]:not([alt=""]), \
    article:has(+ div[data-testid="inline_reply_offscreen"]) video',
  poster:
    'article:has(+ div[data-testid="inline_reply_offscreen"]) a > div > span',
  timestamp: 'article:has(+ div[data-testid="inline_reply_offscreen"]) time',
};
const notLogged: DomQueries = {
  media: 'article img[draggable="true"]:not([alt=""]), article video',
  poster: "article a > div > span",
  timestamp: "article time",
};

function getUrl(element: HTMLImageElement | HTMLVideoElement): string | null {
  const src = element.src.trim();
  return src.length <= 0 ? null : src;
}

function transformUrl(src: string): Media {
  if (src.endsWith(".mp4")) {
    return {
      src,
      ext: "mp4",
    };
  }
  const url = new URL(src);
  let ext: string;
  if (url.searchParams.get("format") === "png") {
    url.searchParams.set("name", "4096x4096");
    ext = "png";
  } else {
    url.searchParams.set("name", "orig");
    url.searchParams.set("format", "jpg");
    ext = "jpg";
  }
  return {
    src: url.toString(),
    ext,
  };
}

function isLoggedIn(): boolean {
  // Looks for reply section as an indicator of whether you're logged in
  return Boolean(
    document.querySelector(
      'article:has(+ div[data-testid="inline_reply_offscreen"])',
    ),
  );
}

function findMedia(query: string): Media[] {
  const media: (HTMLImageElement | HTMLVideoElement)[] = Array.from(
    document.querySelectorAll(query),
  );
  // actual videos (not GIFs) being selected crashes extension by having a <source> instead of src prop
  // so this filter is a crutch
  const mediaData = media
    .map(getUrl)
    .filter((src): src is string => src !== null)
    .map(transformUrl);
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

function parseUrlId(): string {
  // biome-ignore lint/style/noNonNullAssertion: trust me bro
  return window.location.pathname
    .split("/")
    .findLast((slug) => slug.length > 0)!;
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
  const [media, poster, date] = search(isLoggedIn() ? logged : notLogged);

  sendResponse({
    media,
    poster,
    date,
    id: parseUrlId(),
  } satisfies TwitterResponse);
}

// @ts-expect-error you only need to return `true` from listener that sends response when the response is sent asynchronously
browser.runtime.onMessage.addListener(listen);
