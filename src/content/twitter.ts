import browser from "webextension-polyfill";

import { Message } from "./common.ts";

export interface Media {
  image: boolean;
  src: string;
}

export interface TwitterResponse {
  media: Media[];
  poster: string;
  timestamp: string;
  id: string;
}

interface DomQueries {
  media: string;
  poster: string;
  timestamp: string;
}

// Selects the main post using the reply section as the indicator
// alt="Image" excludes profile pictures
// also capture GIFs (actually mp4)
const logged: DomQueries = {
  media:
    'article:has(+ div[data-testid="inline_reply_offscreen"]) img[alt="Image"][draggable="true"], article:has(+ div[data-testid="inline_reply_offscreen"]) video',
  poster:
    'article:has(+ div[data-testid="inline_reply_offscreen"]) a > div > span',
  timestamp: 'article:has(+ div[data-testid="inline_reply_offscreen"]) time',
};
const notLogged: DomQueries = {
  media: 'img[alt="Image"][draggable="true"], article video',
  poster: "article a > div > span",
  timestamp: "article time",
};

function transformUrl(element: HTMLImageElement): Media {
  const src = element.src;
  if (src.endsWith(".mp4")) {
    return {
      image: false,
      src,
    };
  }
  const url = new URL(src);
  url.searchParams.delete("name");
  url.searchParams.set("format", "png");
  return {
    image: true,
    src: url.toString(),
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
  const media: HTMLImageElement[] = Array.from(
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

function findTimestamp(query: string): string {
  const time: HTMLTimeElement | null = document.querySelector(query);
  if (!time || !time.dateTime) {
    throw new Error("couldn't find time");
  }
  return time.dateTime;
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
    findTimestamp(queries.timestamp),
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
  const [media, poster, timestamp] = search(isLoggedIn() ? logged : notLogged);

  sendResponse({
    media,
    poster,
    timestamp,
    id: parseUrlId(),
  } satisfies TwitterResponse);
}

browser.runtime.onMessage.addListener(listen);
