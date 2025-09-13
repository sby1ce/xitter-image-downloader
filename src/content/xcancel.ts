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

export interface XcancelResponse {
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
const queries: DomQueries = {
  media: ".attachment img, .attachment video",
  poster: ".username",
  timestamp: ".tweet-published",
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
  const time: HTMLParagraphElement | null = document.querySelector(query);
  if (!time || !time.textContent) {
    throw new Error("couldn't find time");
  }
  // Timestamp is Nov 20, 2024 · 11:27 PM UTC
  // which is parsable by JS without the dot
  return new Date(time.textContent.replace("·", ""))
    .toISOString()
    .split("T")[0];
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

async function listen(
  message: unknown,
  _sender: browser.Runtime.MessageSender,
): Promise<XcancelResponse | null> {
  if ((message as Message).action !== "getImages") {
    return null;
  }
  const [media, poster, date] = search(queries);

  return {
    media,
    poster,
    date,
    id: parseUrlId(),
  } satisfies XcancelResponse;
}

browser.runtime.onMessage.addListener(listen);
