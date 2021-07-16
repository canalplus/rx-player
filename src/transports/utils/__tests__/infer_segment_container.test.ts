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

import type { Representation } from "../../../manifest";
import inferSegmentContainer from "../infer_segment_container";

describe("Transport utils - inferSegmentContainer", () => {
  it("should return \"mp4\" for audio and video tracks with a specific mime-type", () => {
    expect(inferSegmentContainer("audio",
                                 { bitrate: 0,
                                   id: "1",
                                   index: {},
                                   mimeType: "audio/mp4" } as Representation))
      .toEqual("mp4");
    expect(inferSegmentContainer("video",
                                 { bitrate: 0,
                                   id: "1",
                                   index: {},
                                   mimeType: "video/mp4" } as Representation))
      .toEqual("mp4");
    expect(inferSegmentContainer("audio",
                                 { bitrate: 0,
                                   id: "1",
                                   index: {},
                                   mimeType: "video/mp4" } as Representation))
      .toEqual("mp4");
    expect(inferSegmentContainer("video",
                                 { bitrate: 0,
                                   id: "1",
                                   index: {},
                                   mimeType: "audio/mp4" } as Representation))
      .toEqual("mp4");
  });

  /* eslint-disable max-len */
  it("should return undefined for non-audio nor video tracks with a mime-type indicating mp4 audio or video", () => {
  /* eslint-enable max-len */
    expect(inferSegmentContainer("text",
                                 { bitrate: 0,
                                   id: "1",
                                   index: {},
                                   mimeType: "audio/mp4" } as Representation))
      .toEqual(undefined);
    expect(inferSegmentContainer("text",
                                 { bitrate: 0,
                                   id: "1",
                                   index: {},
                                   mimeType: "video/mp4" } as Representation))
      .toEqual(undefined);
  });

  /* eslint-disable max-len */
  it("should return \"webm\" for audio and video tracks with a specific mime-type", () => {
  /* eslint-enable max-len */
    expect(inferSegmentContainer("audio",
                                 { bitrate: 0,
                                   id: "1",
                                   index: {},
                                   mimeType: "audio/webm" } as Representation))
      .toEqual("webm");
    expect(inferSegmentContainer("video",
                                 { bitrate: 0,
                                   id: "1",
                                   index: {},
                                   mimeType: "video/webm" } as Representation))
      .toEqual("webm");
    expect(inferSegmentContainer("audio",
                                 { bitrate: 0,
                                   id: "1",
                                   index: {},
                                   mimeType: "video/webm" } as Representation))
      .toEqual("webm");
    expect(inferSegmentContainer("video",
                                 { bitrate: 0,
                                   id: "1",
                                   index: {},
                                   mimeType: "audio/webm" } as Representation))
      .toEqual("webm");
  });

  /* eslint-disable max-len */
  it("should return undefined for non-audio nor video tracks with a mime-type indicating webm audio or video", () => {
  /* eslint-enable max-len */
    expect(inferSegmentContainer("text",
                                 { bitrate: 0,
                                   id: "1",
                                   index: {},
                                   mimeType: "audio/webm" } as Representation))
      .toEqual(undefined);
    expect(inferSegmentContainer("text",
                                 { bitrate: 0,
                                   id: "1",
                                   index: {},
                                   mimeType: "video/webm" } as Representation))
      .toEqual(undefined);
  });

  /* eslint-disable max-len */
  it("should return undefined for audio and video tracks with any other mime-type", () => {
  /* eslint-enable max-len */
    expect(inferSegmentContainer("audio",
                                 { bitrate: 0,
                                   id: "1",
                                   index: {},
                                   mimeType: "application/mp4" } as Representation))
      .toEqual(undefined);
    expect(inferSegmentContainer("video",
                                 { bitrate: 0,
                                   id: "1",
                                   index: {},
                                   mimeType: "application/mp4" } as Representation))
      .toEqual(undefined);
    expect(inferSegmentContainer("audio",
                                 { bitrate: 0,
                                   id: "1",
                                   index: {},
                                   mimeType: "" } as Representation))
      .toEqual(undefined);
    expect(inferSegmentContainer("video",
                                 { bitrate: 0,
                                   id: "1",
                                   index: {},
                                   mimeType: "" } as Representation))
      .toEqual(undefined);
    expect(inferSegmentContainer("audio",
                                 { bitrate: 0,
                                   id: "1",
                                   index: {},
                                   mimeType: "foo" } as Representation))
      .toEqual(undefined);
    expect(inferSegmentContainer("video",
                                 { bitrate: 0,
                                   id: "1",
                                   index: {},
                                   mimeType: "bar" } as Representation))
      .toEqual(undefined);
    expect(inferSegmentContainer("audio",
                                 { bitrate: 0,
                                   id: "1",
                                   index: {} } as Representation))
      .toEqual(undefined);
    expect(inferSegmentContainer("video",
                                 { bitrate: 0,
                                   id: "1",
                                   index: {} } as Representation))
      .toEqual(undefined);
  });

  it("should return \"mp4\" for a text track with a specific mime-type", () => {
    expect(inferSegmentContainer("text",
                                 { bitrate: 0,
                                   id: "1",
                                   index: {},
                                   mimeType: "application/mp4" } as Representation))
      .toEqual("mp4");
  });


  it("should return undefined for text tracks with any other mime-type", () => {
    expect(inferSegmentContainer("text",
                                 { bitrate: 0,
                                   id: "1",
                                   index: {},
                                   mimeType: "text/mp4" } as Representation))
      .toEqual(undefined);
    expect(inferSegmentContainer("text",
                                 { bitrate: 0,
                                   id: "1",
                                   index: {},
                                   mimeType: "text/plain" } as Representation))
      .toEqual(undefined);
    expect(inferSegmentContainer("text",
                                 { bitrate: 0,
                                   id: "1",
                                   index: {},
                                   mimeType: "" } as Representation))
      .toEqual(undefined);
    expect(inferSegmentContainer("text",
                                 { bitrate: 0,
                                   id: "1",
                                   index: {},
                                   mimeType: "foo" } as Representation))
      .toEqual(undefined);
    expect(inferSegmentContainer("text",
                                 { bitrate: 0,
                                   id: "1",
                                   index: {} } as Representation))
      .toEqual(undefined);
  });
});
