/*
Copyright 2026 sby1ce

SPDX-License-Identifier: AGPL-3.0-or-later
*/

export interface Media {
  src: string;
  ext: string;
}

export interface BskyResponse {
  media: Media[];
  poster: string;
  date: string;
  id: string;
}

function extractPathParts(url: string): { handleOrDid: string; rkey: string } {
  const path = new URL(url).pathname;
  // /profile/{handleOrDid}/post/{rkey}
  const parts = path.split("/").filter(Boolean);
  // parts[0] = "profile", parts[1] = handleOrDid, parts[2] = "post", parts[3] = rkey
  if (parts.length < 4 || parts[0] !== "profile" || parts[2] !== "post") {
    throw new Error("Invalid Bluesky post URL");
  }
  return { handleOrDid: parts[1], rkey: parts[3] };
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
  return iso.split("T")[0];
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
