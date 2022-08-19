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

import config from "../../../config";
import { getLoadedContentState } from "../utils";

describe("API - getLoadedContentState", () => {
  it("should always return ENDED if mediaElement.ended is true", () => {
    const fakeProps = {
      ended: true,
      duration: 100000,
      currentTime: 0,
      paused: false,
    };
    const mediaElement = fakeProps as HTMLMediaElement;

    // we can just do every possibility here
    expect(getLoadedContentState(mediaElement, null))
      .toBe("ENDED");
    fakeProps.paused = true;
    expect(getLoadedContentState(mediaElement, null))
      .toBe("ENDED");
    expect(getLoadedContentState(mediaElement, "seeking")).toBe("ENDED");
    expect(getLoadedContentState(mediaElement, "not-ready")).toBe("ENDED");
    expect(getLoadedContentState(mediaElement, "buffering")).toBe("ENDED");
    expect(getLoadedContentState(mediaElement, "freezing")).toBe("ENDED");
    fakeProps.paused = false;
    expect(getLoadedContentState(mediaElement, "seeking")).toBe("ENDED");
    expect(getLoadedContentState(mediaElement, "not-ready")).toBe("ENDED");
    expect(getLoadedContentState(mediaElement, "buffering")).toBe("ENDED");
    expect(getLoadedContentState(mediaElement, "freezing")).toBe("ENDED");
  });

  it("should be PLAYING if not stalled nor ended and if not paused", () => {
    const fakeProps = {
      ended: false,
      duration: 10,
      currentTime: 10, // worst case -> currentTime === duration
      paused: false,
    };
    const mediaElement = fakeProps as HTMLMediaElement;
    expect(getLoadedContentState(mediaElement, null))
      .toBe("PLAYING");
  });

  it("should be PAUSED if not stalled nor ended and if paused", () => {
    const fakeProps = {
      ended: false,
      duration: 10,
      currentTime: 10, // worst case -> currentTime === duration
      paused: true,
    };
    const mediaElement = fakeProps as HTMLMediaElement;
    expect(getLoadedContentState(mediaElement, null))
      .toBe("PAUSED");
  });

  it("should be BUFFERING if not ended and stalled because of buffering", () => {
    const fakeProps = {
      ended: false,
      duration: 10,
      currentTime: 5,
      paused: false,
    };
    const mediaElement = fakeProps as HTMLMediaElement;
    expect(getLoadedContentState(mediaElement, "buffering")).toBe("BUFFERING");
    fakeProps.paused = true;
    expect(getLoadedContentState(mediaElement, "buffering")).toBe("BUFFERING");
  });

  it("should be FREEZING if not ended and stalled because of freezing", () => {
    const fakeProps = {
      ended: false,
      duration: 10,
      currentTime: 5,
      paused: false,
    };
    const mediaElement = fakeProps as HTMLMediaElement;
    expect(getLoadedContentState(mediaElement, "freezing")).toBe("FREEZING");
    fakeProps.paused = true;
    expect(getLoadedContentState(mediaElement, "freezing")).toBe("FREEZING");
  });

  it("should be BUFFERING if not ended and stalled because of `not-ready`", () => {
    const fakeProps = {
      ended: false,
      duration: 10,
      currentTime: 5,
      paused: false,
    };
    const mediaElement = fakeProps as HTMLMediaElement;
    expect(getLoadedContentState(mediaElement, "not-ready")).toBe("BUFFERING");
    fakeProps.paused = true;
    expect(getLoadedContentState(mediaElement, "not-ready")).toBe("BUFFERING");
  });

  it("should be SEEKING if not ended and stalled because of `seeking`", () => {
    const fakeProps = {
      ended: false,
      duration: 10,
      currentTime: 5,
      paused: false,
    };
    const mediaElement = fakeProps as HTMLMediaElement;
    expect(getLoadedContentState(mediaElement, "seeking")).toBe("SEEKING");
    fakeProps.paused = true;
    expect(getLoadedContentState(mediaElement, "seeking")).toBe("SEEKING");
  });

  it("should be ENDED if stalled and currentTime is equal to duration", () => {
    const fakeProps = {
      ended: false,
      duration: 10,
      currentTime: 10,
      paused: false,
    };
    const mediaElement = fakeProps as HTMLMediaElement;
    expect(getLoadedContentState(mediaElement, "seeking")).toBe("ENDED");
    expect(getLoadedContentState(mediaElement, "buffering")).toBe("ENDED");
    expect(getLoadedContentState(mediaElement, "not-ready")).toBe("ENDED");
    expect(getLoadedContentState(mediaElement, "freezing")).toBe("ENDED");
    fakeProps.paused = true;
    expect(getLoadedContentState(mediaElement, "seeking")).toBe("ENDED");
    expect(getLoadedContentState(mediaElement, "buffering")).toBe("ENDED");
    expect(getLoadedContentState(mediaElement, "not-ready")).toBe("ENDED");
    expect(getLoadedContentState(mediaElement, "freezing")).toBe("ENDED");
  });

  it("should be ENDED if stalled and currentTime is very close to the duration", () => {
    const fakeProps = {
      ended: false,
      duration: 10,
      currentTime: 10 - config.getCurrent().FORCED_ENDED_THRESHOLD,
      paused: false,
    };
    const mediaElement = fakeProps as HTMLMediaElement;
    expect(getLoadedContentState(mediaElement, "seeking")).toBe("ENDED");
    expect(getLoadedContentState(mediaElement, "buffering")).toBe("ENDED");
    expect(getLoadedContentState(mediaElement, "not-ready")).toBe("ENDED");
    expect(getLoadedContentState(mediaElement, "freezing")).toBe("ENDED");
    fakeProps.paused = true;
    expect(getLoadedContentState(mediaElement, "seeking")).toBe("ENDED");
    expect(getLoadedContentState(mediaElement, "buffering")).toBe("ENDED");
    expect(getLoadedContentState(mediaElement, "not-ready")).toBe("ENDED");
    expect(getLoadedContentState(mediaElement, "freezing")).toBe("ENDED");
  });
  it("should be ENDED if stalled and currentTime is very close to the duration", () => {
    const fakeProps1 = {
      ended: false,
      duration: 10,
      currentTime: 10 - config.getCurrent().FORCED_ENDED_THRESHOLD,
      paused: false,
    };
    const mediaElement1 = fakeProps1 as HTMLMediaElement;
    expect(getLoadedContentState(mediaElement1, "seeking")).toBe("ENDED");
    expect(getLoadedContentState(mediaElement1, "buffering")).toBe("ENDED");
    expect(getLoadedContentState(mediaElement1, "not-ready")).toBe("ENDED");
    expect(getLoadedContentState(mediaElement1, "freezing")).toBe("ENDED");
    fakeProps1.paused = true;
    expect(getLoadedContentState(mediaElement1, "seeking")).toBe("ENDED");
    expect(getLoadedContentState(mediaElement1, "buffering")).toBe("ENDED");
    expect(getLoadedContentState(mediaElement1, "not-ready")).toBe("ENDED");
    expect(getLoadedContentState(mediaElement1, "freezing")).toBe("ENDED");

    const fakeProps2 = {
      ended: false,
      duration: 10,
      currentTime: config.getCurrent().FORCED_ENDED_THRESHOLD + 10,
      paused: false,
    };
    const mediaElement2 = fakeProps2 as HTMLMediaElement;
    expect(getLoadedContentState(mediaElement2, "seeking")).toBe("ENDED");
    expect(getLoadedContentState(mediaElement2, "buffering")).toBe("ENDED");
    expect(getLoadedContentState(mediaElement2, "not-ready")).toBe("ENDED");
    expect(getLoadedContentState(mediaElement2, "freezing")).toBe("ENDED");
    fakeProps2.paused = true;
    expect(getLoadedContentState(mediaElement2, "seeking")).toBe("ENDED");
    expect(getLoadedContentState(mediaElement2, "buffering")).toBe("ENDED");
    expect(getLoadedContentState(mediaElement2, "not-ready")).toBe("ENDED");
    expect(getLoadedContentState(mediaElement2, "freezing")).toBe("ENDED");
  });
});
