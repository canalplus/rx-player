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

import isWEBMEmbeddedTrack from "../is_webm_embedded_track";

const webmEmbeddedMimeTypes = [
  "audio/webm",
  "video/webm",
];

describe("DASH - isWEBMEmbeddedTrack", () => {
  it("should return true for any webm-embedded mimeTypes", () => {
    webmEmbeddedMimeTypes.forEach(mimeType => {
      expect(isWEBMEmbeddedTrack({ bitrate: 0,
                                  id: "1",
                                  index: {},
                                  mimeType } as any))
        .toBe(true);
    });
  });

  it("should return false for no mimeType", () => {
    expect(isWEBMEmbeddedTrack({ bitrate: 0,
                                id: "1",
                                index: {} } as any))
      .toBe(false);
  });

  it("should return false for any other mimeType", () => {
    expect(isWEBMEmbeddedTrack({ bitrate: 0,
                                id: "1",
                                index: {},
                                mimeType: "foo/bar" } as any))
      .toBe(false);
  });
});
