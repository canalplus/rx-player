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

import attachTrickModeTrack from "../attach_trickmode_track";

describe("attachTrickModeTrack", () => {
  it("should correclty attach trickmode tracks", () => {
    /* eslint-disable @typescript-eslint/no-unsafe-assignment */
    const trickModeTracks = [
      { adaptation: { type: "video" }, trickModeAttachedAdaptationIds: ["1", "3"] },
      { adaptation: { type: "audio" }, trickModeAttachedAdaptationIds: ["1"] },
    ] as any;

    const adaptations = {
      video: [
        { id: "1", trickModeTracks: undefined },
        { id: "2", trickModeTracks: undefined },
        { id: "3", trickModeTracks: undefined },
        { id: "4", trickModeTracks: undefined },
      ],
      audio: [
        { id: "1", trickModeTracks: undefined },
        { id: "2", trickModeTracks: undefined },
        { id: "3", trickModeTracks: undefined },
      ],
    } as any;
    /* eslint-enable @typescript-eslint/no-unsafe-assignment */

    attachTrickModeTrack(adaptations, trickModeTracks);

    expect(adaptations).toEqual({
      video: [
        { id: "1",
          trickModeTracks: [{ type: "video" },
                            { type: "audio" }] },
        { id: "2", trickModeTracks: undefined },
        { id: "3", trickModeTracks: [{ type: "video" }] },
        { id: "4", trickModeTracks: undefined },
      ],
      audio: [
        { id: "1",
          trickModeTracks: [{ type: "video" },
                            { type: "audio" }] },
        { id: "2", trickModeTracks: undefined },
        { id: "3", trickModeTracks: [{ type: "video" }] },
      ],
    });
  });
});
