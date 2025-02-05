import browser from "webextension-polyfill";

export interface Message {
  action: string;
}

export interface TwitterResponse {
  images: string[];
  poster: string;
  timestamp: string;
  id: string;
}

interface DomQueries {
  images: string;
  poster: string;
  timestamp: string;
}

// Selects the main post using the reply section as the indicator
// alt="Image" excludes profile pictures
const logged: DomQueries = {
  images:
    'article:has(+ div[data-testid="inline_reply_offscreen"]) img[class][alt="Image"][draggable="true"]',
  poster:
    'article:has(+ div[data-testid="inline_reply_offscreen"]) a > div > span',
  timestamp: 'article:has(+ div[data-testid="inline_reply_offscreen"]) time',
};
const notLogged: DomQueries = {
  images: 'img[class][alt="Image"][draggable="true"]',
  poster: "article a > div > span",
  timestamp: "article time",
};

function transformUrl(img: HTMLImageElement): string {
  const url = new URL(img.src);
  url.searchParams.delete("name");
  url.searchParams.set("format", "png");
  return url.toString();
}

function isLoggedIn(): boolean {
  // Looks for reply section as an indicator of whether you're logged in
  return Boolean(
    document.querySelector(
      'article:has(+ div[data-testid="inline_reply_offscreen"])',
    ),
  );
}

function findImages(query: string): string[] {
  const images: HTMLImageElement[] = Array.from(
    document.querySelectorAll(query),
  );
  const imageData = images.map(transformUrl);
  return imageData;
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

function search(queries: DomQueries): [string[], string, string] {
  return [
    findImages(queries.images),
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
  console.log(message);
  if ((message as Message).action !== "getImages") {
    return;
  }
  const [images, poster, timestamp] = search(isLoggedIn() ? logged : notLogged);

  sendResponse({
    images,
    poster,
    timestamp,
    id: parseUrlId(),
  } satisfies TwitterResponse);
}

browser.runtime.onMessage.addListener(listen);
