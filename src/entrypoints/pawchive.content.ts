/*
Copyright 2026 sby1ce

SPDX-License-Identifier: AGPL-3.0-or-later
*/

import { defineContentScript } from "#imports";
import type { Media, PawchiveResponse } from "@/common/pawchive";
import { messenger } from "@/messenger.ts";

interface DomQueries {
  media: string;
  poster: string;
  timestamp: string;
}

const queries: DomQueries = {
  media: "figure > a:has(> img[loading]), video > source",
  poster: "header a:not(:has(*))",
  timestamp: ".post__published",
};

function isAnchor(
  el: HTMLAnchorElement | HTMLSourceElement,
): el is HTMLAnchorElement {
  return el.tagName === "A";
}

function parseFilename(filename: string): { filestem: string; ext: string } {
  const dot = filename.lastIndexOf(".");
  const filestem = filename.slice(0, dot);
  const ext = filename.slice(dot + 1);
  return {
    filestem,
    ext,
  };
}

function findMedia(query: string): Media[] {
  const media: (HTMLAnchorElement | HTMLSourceElement)[] = Array.from(
    document.querySelectorAll(query),
  );
  return media
    .map((el) => (isAnchor(el) ? el.href : el.src))
    .map((src: string) => {
      const url = new URL(src);
      const filename = url.searchParams.get("f") ?? "";
      return {
        ...parseFilename(filename),
        src,
      };
    });
}

function findPoster(query: string): string {
  const name: HTMLSpanElement | null = document.querySelector(query);
  if (!name?.textContent) {
    throw new Error("couldn't find name");
  }
  return name.textContent.trim();
}

function findDate(query: string): string {
  const time: HTMLDivElement | null = document.querySelector(query);
  if (!time?.textContent) {
    throw new Error("couldn't find time");
  }
  // text content is given like `\n            Published: 2026-11-24 20:19:15\n           `
  // biome-ignore lint/style/noNonNullAssertion: trust me bro
  return time.textContent.trim().split(" ")[1]!;
}

function parseUrl(): Pick<PawchiveResponse, "platform" | "posterId" | "id"> {
  // pathname is expected to be like
  // `/{patreon|fanbox}/user/{user-id}/post/{post-id}`
  const slugs = window.location.pathname.split("/");
  if (slugs.length < 6) {
    throw new Error("couldn't find post id");
  }
  return {
    // biome-ignore lint/style/noNonNullAssertion: trust me bro
    platform: slugs[1]!,
    // biome-ignore lint/style/noNonNullAssertion: trust me bro
    posterId: slugs[3]!,
    // biome-ignore lint/style/noNonNullAssertion: trust me bro
    id: slugs[5]!,
  };
}

function search(
  queries: DomQueries,
): Pick<PawchiveResponse, "media" | "poster" | "date"> {
  return {
    media: findMedia(queries.media),
    poster: findPoster(queries.poster),
    date: findDate(queries.timestamp),
  };
}

export default defineContentScript({
  matches: ["*://pawchive.pw/*"],
  async main(): Promise<void> {
    messenger.onMessage("getImagesPawchive", () => {
      const found = search(queries);

      return {
        ...found,
        ...parseUrl(),
      } satisfies PawchiveResponse;
    });
  },
});
