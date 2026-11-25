/*
Copyright 2026 sby1ce

SPDX-License-Identifier: AGPL-3.0-or-later
*/

export interface Media {
  src: string;
}

export interface DiscordResponse {
  media: Media[];
  poster: string;
  date: string;
}
