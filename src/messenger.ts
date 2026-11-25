/*
Copyright 2026 sby1ce

SPDX-License-Identifier: AGPL-3.0-or-later
*/

import { defineExtensionMessaging } from "@webext-core/messaging";
import type { DiscordResponse } from "@/common/discord.ts";
import type { PixivResponse } from "@/common/pixiv.ts";
import type { RedditResponse } from "@/common/reddit.ts";
import type { TwitterResponse } from "@/common/twitter.ts";

export interface ProtocolMap {
  getImagesTwitter(): TwitterResponse;
  getImagesDiscord(): DiscordResponse;
  getImagesPixiv(): PixivResponse;
  getImagesReddit(): RedditResponse;

  pixiv(data: { imageUrl: string; filename: string }): void;
}

export const messenger = defineExtensionMessaging<ProtocolMap>();
