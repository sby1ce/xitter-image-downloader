/*
Copyright 2026 sby1ce

SPDX-License-Identifier: AGPL-3.0-or-later
*/

export interface Media {
  src: string;
}

export interface PixivResponse {
  // The id alongside index is in the src string
  media: Media[];
  poster: string;
  date: string;
}
