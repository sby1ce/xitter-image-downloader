import browser from "webextension-polyfill";

import type { Message } from "./common.ts";

export interface Media {
  image: boolean;
  src: string;
}

export interface DiscordResponse {
  media: Media[];
  poster: string;
  date: string;
}

interface DomQueries {
  media: string;
  poster: string;
  timestamp: string;
}

// li is searching for the first message to only select the original post
const queries: DomQueries = {
  media: "li:first-of-type a[data-safe-src]",
  // vencord-only, only select the username which comes first
  poster: "li:first-of-type h3 > span > span:first-child",
  timestamp: "li:first-of-type h3 > span > time",
};

function transformUrl(element: HTMLAnchorElement): Media {
  // biome-ignore lint/style/noNonNullAssertion: trust me bro
  const src = element.dataset.safeSrc!;
  const url = new URL(src);
  const host = url.host.replace("media", "cdn").replace("net", "com");
  url.host = host;
  url.search = "";
  return {
    image: true,
    src: url.toString(),
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
  // `toLowerCase` is handling the case where the shown name is equal to username but has different casing
  // biome-ignore lint/style/noNonNullAssertion: trust me bro
  const username = name.childNodes[0].textContent!.toLowerCase();
  return username;
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
  } satisfies DiscordResponse);
}

browser.runtime.onMessage.addListener(listen);
