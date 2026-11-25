/*
Copyright 2026 sby1ce

SPDX-License-Identifier: AGPL-3.0-or-later
*/

import { browser } from "#imports";

import type { BskyResponse, Media } from "@/common/bsky.ts";

function resolveUrl(base: string, relative: string): string {
  return new URL(relative, base).toString();
}

async function parsePlaylist(playlistUrl: string): Promise<string[]> {
  const resp = await fetch(playlistUrl);
  if (!resp.ok) {
    throw new Error(`Failed to fetch playlist: ${resp.status}`);
  }
  const text = await resp.text();

  if (text.includes("#EXT-X-STREAM-INF")) {
    const lines = text.split("\n");
    let bestUrl: string | null = null;
    let bestBandwidth = -1;

    for (let i = 0; i < lines.length; i++) {
      // biome-ignore lint/style/noNonNullAssertion: trust me bro
      const line = lines[i]!.trim();
      if (line.startsWith("#EXT-X-STREAM-INF:")) {
        const bandwidthMatch = line.match(/BANDWIDTH=(\d+)/);
        const bandwidth = bandwidthMatch?.[1]
          ? Number.parseInt(bandwidthMatch[1], 10)
          : 0;
        for (let j = i + 1; j < lines.length; j++) {
          // biome-ignore lint/style/noNonNullAssertion: trust me bro
          const next = lines[j]!.trim();
          if (next.length > 0 && !next.startsWith("#")) {
            if (bandwidth > bestBandwidth) {
              bestBandwidth = bandwidth;
              bestUrl = resolveUrl(playlistUrl, next);
            }
            break;
          }
        }
      }
    }

    if (!bestUrl) {
      throw new Error("No stream found in master playlist");
    }
    return parsePlaylist(bestUrl);
  }

  const lines = text.split("\n");
  const segments: string[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.length > 0 && !trimmed.startsWith("#")) {
      segments.push(resolveUrl(playlistUrl, trimmed));
    }
  }

  if (segments.length === 0) {
    throw new Error("No segments found in media playlist");
  }
  return segments;
}

/** Don't blame this on me, blame this on bluesky and refusing to have an mp4 download */
async function downloadAndConcatVideo(
  playlistUrl: string,
  filename: string,
): Promise<void> {
  const segmentUrls = await parsePlaylist(playlistUrl);

  const buffers: ArrayBuffer[] = await Promise.all(
    segmentUrls.map(async (url) => {
      const resp = await fetch(url);
      if (!resp.ok) {
        throw new Error(`Failed to fetch segment: ${resp.status} for ${url}`);
      }
      return resp.arrayBuffer();
    }),
  );

  const totalLength = buffers.reduce((acc, buf) => acc + buf.byteLength, 0);
  const combined = new Uint8Array(totalLength);
  let offset = 0;
  for (const buf of buffers) {
    combined.set(new Uint8Array(buf), offset);
    offset += buf.byteLength;
  }

  const blob = new Blob([combined], { type: "video/MP2T" });
  const objectUrl = URL.createObjectURL(blob);

  try {
    const downloadId = await browser.downloads.download({
      url: objectUrl,
      filename,
      saveAs: true,
    });
    if (downloadId === undefined) {
      console.error(browser.runtime.lastError);
    }
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function constructFilename(
  poster: string,
  id: string,
  date: string,
  index: number,
  ext: string,
): string {
  return `${poster}-${id}-${date}-${index + 1}.${ext}`;
}

async function downloadMedia(
  poster: string,
  id: string,
  date: string,
  media: Media,
  index: number,
): Promise<void> {
  const filename: string = constructFilename(
    poster,
    id,
    date,
    index,
    media.ext,
  );

  if (media.ext === "ts") {
    await downloadAndConcatVideo(media.src, filename);
    return;
  }

  const downloadId: number | undefined = await browser.downloads.download({
    url: media.src,
    filename,
    saveAs: true,
  });
  if (downloadId === undefined) {
    console.error(browser.runtime.lastError);
  }
}

async function download(event: SubmitEvent, data: BskyResponse): Promise<void> {
  event.preventDefault();

  const date: string = data.date;
  const poster: string = data.poster;
  const id: string = data.id;

  const form = event.target as HTMLFormElement;
  const body = new FormData(form);
  const index: number = Number.parseInt(body.get("selected") as string, 10);

  if (Number.isNaN(index)) {
    // All option selected
    for (let index = 0; index < data.media.length; index++) {
      // biome-ignore lint/style/noNonNullAssertion: trust me bro
      const media: Media = data.media[index]!;
      await downloadMedia(poster, id, date, media, index);
    }
    return;
  }

  // biome-ignore lint/style/noNonNullAssertion: trust me bro
  const media: Media = data.media[index]!;
  await downloadMedia(poster, id, date, media, index);
}

export function handleBsky(data: BskyResponse): (event: SubmitEvent) => void {
  return (event: SubmitEvent) =>
    download(event, data)
      .then(() => {}, console.error)
      .catch(console.error);
}

export function checkBsky(response: BskyResponse | null): response is null {
  return !response || response.media.length < 1;
}

function extractPathParts(url: string): { handleOrDid: string; rkey: string } {
  const path = new URL(url).pathname;
  // /profile/{handleOrDid}/post/{rkey}
  const parts = path.split("/").filter(Boolean);
  // parts[0] = "profile", parts[1] = handleOrDid, parts[2] = "post", parts[3] = rkey
  if (parts.length < 4 || parts[0] !== "profile" || parts[2] !== "post") {
    throw new Error("Invalid Bluesky post URL");
  }
  // biome-ignore lint/style/noNonNullAssertion: trust me bro
  return { handleOrDid: parts[1]!, rkey: parts[3]! };
}

async function resolveDid(handleOrDid: string): Promise<string> {
  if (handleOrDid.startsWith("did:")) {
    return handleOrDid;
  }
  const url = `https://public.api.bsky.app/xrpc/com.atproto.identity.resolveHandle?handle=${encodeURIComponent(handleOrDid)}`;
  const resp = await fetch(url);
  if (!resp.ok) {
    throw new Error(`Failed to resolve handle: ${resp.status}`);
  }
  const data = await resp.json();
  return data.did;
}

function formatDate(iso: string): string {
  // biome-ignore lint/style/noNonNullAssertion: trust me bro
  return iso.split("T")[0]!;
}

interface ImageView {
  fullsize: string;
  thumb: string;
  alt: string;
}

interface ImagesEmbedView {
  $type: "app.bsky.embed.images#view";
  images: ImageView[];
}

interface VideoEmbedView {
  $type: "app.bsky.embed.video#view";
  cid: string;
  playlist: string;
  thumbnail: string;
  presentation: "gif" | "default";
}

interface RecordWithMediaEmbedView {
  $type: "app.bsky.embed.recordWithMedia#view";
  media: ImagesEmbedView | VideoEmbedView;
}

type EmbedView = ImagesEmbedView | VideoEmbedView | RecordWithMediaEmbedView;

interface GetPosts {
  posts: {
    author: {
      handle: string;
    };
    record: {
      createdAt: string;
    };
    embed: EmbedView;
  }[];
}

function extractMedia(embed: EmbedView, did: string): Media[] {
  switch (embed.$type) {
    case "app.bsky.embed.images#view":
      return embed.images.map((img) => {
        // Append @jpeg to have BSky serve JPEG instead of default WebP
        const src = `${img.fullsize}@jpeg`;
        return { src, ext: "jpeg" };
      });
    case "app.bsky.embed.video#view":
      return [
        {
          src: embed.playlist,
          ext: "ts",
        },
      ];
    case "app.bsky.embed.recordWithMedia#view":
      return extractMedia(embed.media, did);
    default:
      return [];
  }
}

export async function fetchBskyPost(url: string): Promise<BskyResponse | null> {
  const { handleOrDid, rkey } = extractPathParts(url);
  const did = await resolveDid(handleOrDid);

  const atUri = `at://${did}/app.bsky.feed.post/${rkey}`;
  const apiUrl = `https://public.api.bsky.app/xrpc/app.bsky.feed.getPosts?uris=${encodeURIComponent(atUri)}`;
  const resp = await fetch(apiUrl);
  if (!resp.ok) {
    console.error(`Failed to fetch post: ${resp.status}`);
    return null;
  }
  const data: GetPosts = await resp.json();

  const post = data.posts?.at(0);
  if (!post) {
    console.error("Post not found");
    return null;
  }

  const poster = post.author.handle;
  const date = formatDate(post.record.createdAt);
  const media = extractMedia(post.embed, did);

  return { media, poster, date, id: rkey };
}
