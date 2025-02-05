import browser from "webextension-polyfill";

export interface Message {
  action: string;
}

export interface ExtResponse {
  images: string[];
  poster: string;
}

interface DomQueries {
  images: string;
  poster: string;
}

// Selects the main post using the reply section as the indicator
// alt="Image" excludes profile pictures
const logged: DomQueries = {
  images:
    'article:has(+ div[data-testid="inline_reply_offscreen"]) img[class][alt="Image"][draggable="true"]',
  poster:
    'article:has(+ div[data-testid="inline_reply_offscreen"]) a > div > span',
};
const notLogged: DomQueries = {
  images: 'img[class][alt="Image"][draggable="true"]',
  poster: "article a > div > span",
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

function search(query: string): string[] {
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
  let images: string[];
  let poster: string;
  if (isLoggedIn()) {
    images = search(logged.images);
    poster = findPoster(logged.poster);
  } else {
    images = search(notLogged.images);
    poster = findPoster(notLogged.poster);
  }
  sendResponse({
    images,
    poster,
  } satisfies ExtResponse);
}

browser.runtime.onMessage.addListener(listen);
