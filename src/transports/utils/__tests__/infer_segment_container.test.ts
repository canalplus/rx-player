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

import inferSegmentContainer from "../infer_segment_container";

describe("Transport utils - inferSegmentContainer", () => {
  it("should return \"mp4\" for audio and video tracks with a specific mime-type", () => {
    expect(inferSegmentContainer("audio", "audio/mp4")).toEqual("mp4");
    expect(inferSegmentContainer("video", "video/mp4")).toEqual("mp4");
    expect(inferSegmentContainer("audio", "video/mp4")).toEqual("mp4");
    expect(inferSegmentContainer("video", "audio/mp4")).toEqual("mp4");
  });

  /* eslint-disable max-len */
  it("should return undefined for non-audio nor video tracks with a mime-type indicating mp4 audio or video", () => {
  /* eslint-enable max-len */
    expect(inferSegmentContainer("text", "audio/mp4")).toEqual(undefined);
    expect(inferSegmentContainer("text", "video/mp4")).toEqual(undefined);
  });

  /* eslint-disable max-len */
  it("should return \"webm\" for audio and video tracks with a specific mime-type", () => {
  /* eslint-enable max-len */
    expect(inferSegmentContainer("audio", "audio/webm")).toEqual("webm");
    expect(inferSegmentContainer("video", "video/webm")).toEqual("webm");
    expect(inferSegmentContainer("audio", "video/webm")).toEqual("webm");
    expect(inferSegmentContainer("video", "audio/webm")).toEqual("webm");
  });

  /* eslint-disable max-len */
  it("should return undefined for non-audio nor video tracks with a mime-type indicating webm audio or video", () => {
  /* eslint-enable max-len */
    expect(inferSegmentContainer("text", "audio/webm")).toEqual(undefined);
    expect(inferSegmentContainer("text", "video/webm")).toEqual(undefined);
  });

  /* eslint-disable max-len */
  it("should return undefined for audio and video tracks with any other mime-type", () => {
  /* eslint-enable max-len */
    expect(inferSegmentContainer("audio", "application/mp4"))
      .toEqual(undefined);
    expect(inferSegmentContainer("video", "application/mp4"))
      .toEqual(undefined);
    expect(inferSegmentContainer("audio", ""))
      .toEqual(undefined);
    expect(inferSegmentContainer("video", ""))
      .toEqual(undefined);
    expect(inferSegmentContainer("audio", "foo"))
      .toEqual(undefined);
    expect(inferSegmentContainer("video", "bar"))
      .toEqual(undefined);
    expect(inferSegmentContainer("audio", undefined)).toEqual(undefined);
  });

  it("should return \"mp4\" for a text track with a specific mime-type", () => {
    expect(inferSegmentContainer("text", "application/mp4")).toEqual("mp4");
  });


  it("should return undefined for text tracks with any other mime-type", () => {
    expect(inferSegmentContainer("text", "text/mp4")).toEqual(undefined);
    expect(inferSegmentContainer("text", "text/plain")).toEqual(undefined);
    expect(inferSegmentContainer("text", "")).toEqual(undefined);
    expect(inferSegmentContainer("text", "foo")).toEqual(undefined);
    expect(inferSegmentContainer("text", undefined)).toEqual(undefined);
  });
});
