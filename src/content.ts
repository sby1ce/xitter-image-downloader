import browser from "webextension-polyfill";

export interface Message {
  action: string;
}

export interface ExtResponse {
  images: string[];
  poster: string;
}

function transformUrl(img: HTMLImageElement): string {
  const url = new URL(img.src);
  url.searchParams.delete("name");
  url.searchParams.set("format", "png");
  return url.toString();
}

function search(): string[] {
  // Selects the main post using the reply section as the indicator
  // alt="Image" excludes profile pictures
  const images: HTMLImageElement[] = Array.from(
    document.querySelectorAll(
      'article:has(+ div[data-testid="inline_reply_offscreen"]) img[class][alt="Image"][draggable="true"]',
    ),
  );
  const imageData = images.map(transformUrl);
  return imageData;
}

function findPoster(): string {
  const name: HTMLSpanElement | null = document.querySelector(
    "article a > div > span",
  );
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
  sendResponse({ images: search(), poster: findPoster() });
}

browser.runtime.onMessage.addListener(listen);
