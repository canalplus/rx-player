/**
 * Copyright 2015 CANAL+ Group
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import isMP4EmbeddedTextTrack from "../is_mp4_embedded_text_track";

const mp4EmbeddedMimeTypes = [
  "application/mp4",
];

describe("DASH - isMP4EmbeddedTextTrack", () => {
  it("should return true for any mp4-embedded mimeTypes", () => {
    mp4EmbeddedMimeTypes.forEach(mimeType => {
      expect(isMP4EmbeddedTextTrack({ bitrate: 0,
                                  id: "1",
                                  index: {},
                                  mimeType } as any))
        .toBe(true);
    });
  });

  it("should return false for no mimeType", () => {
    expect(isMP4EmbeddedTextTrack({ bitrate: 0,
                                id: "1",
                                index: {} } as any))
      .toBe(false);
  });

  it("should return false for a video or audio mimeType", () => {
    expect(isMP4EmbeddedTextTrack({ bitrate: 0,
                                id: "1",
                                index: {},
                                mimeType: "audio/mp4" } as any))
      .toBe(false);
    expect(isMP4EmbeddedTextTrack({ bitrate: 0,
                                id: "1",
                                index: {},
                                mimeType: "video/mp4" } as any))
      .toBe(false);
  });

  it("should return false for any other mimeType", () => {
    expect(isMP4EmbeddedTextTrack({ bitrate: 0,
                                id: "1",
                                index: {},
                                mimeType: "foo/bar" } as any))
      .toBe(false);
  });
});
