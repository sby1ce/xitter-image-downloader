/*
Copyright 2026 sby1ce

SPDX-License-Identifier: AGPL-3.0-or-later
*/

export interface Media {
  src: string;
  // original filename
  filestem: string;
  ext: string;
}

export interface PawchiveResponse {
  media: Media[];
  platform: string;
  posterId: string;
  poster: string;
  date: string;
  id: string;
}
