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

import { expect } from "chai";
import config from "../../../config";
import getLoadedContentState from "../get_player_state";

describe("API - getLoadedContentState", () => {
  it("should always return ENDED if mediaElement.ended is true", () => {
    const fakeProps = {
      ended: true,
      duration: 100000,
      currentTime: 0,
    };
    const mediaElement = fakeProps as HTMLMediaElement;

    // we can just do every possibility here
    expect(getLoadedContentState(mediaElement, true, null))
      .to.equal("ENDED");
    expect(getLoadedContentState(mediaElement, false, null))
      .to.equal("ENDED");
    expect(getLoadedContentState(mediaElement, true, {
      reason: "seeking",
    })).to.equal("ENDED");
    expect(getLoadedContentState(mediaElement, true, {
      reason: "not-ready",
    })).to.equal("ENDED");
    expect(getLoadedContentState(mediaElement, true, {
      reason: "buffering",
    })).to.equal("ENDED");
    expect(getLoadedContentState(mediaElement, false, {
      reason: "seeking",
    })).to.equal("ENDED");
    expect(getLoadedContentState(mediaElement, false, {
      reason: "not-ready",
    })).to.equal("ENDED");
    expect(getLoadedContentState(mediaElement, false, {
      reason: "buffering",
    })).to.equal("ENDED");
  });

  it("should be PLAYING if not stalled nor ended and if not paused", () => {
    const fakeProps = {
      ended: false,
      duration: 10,
      currentTime: 10, // worst case -> currentTime === duration
    };
    const mediaElement = fakeProps as HTMLMediaElement;
    expect(getLoadedContentState(mediaElement, true, null))
      .to.equal("PLAYING");
  });

  it("should be PAUSED if not stalled nor ended and if paused", () => {
    const fakeProps = {
      ended: false,
      duration: 10,
      currentTime: 10, // worst case -> currentTime === duration
    };
    const mediaElement = fakeProps as HTMLMediaElement;
    expect(getLoadedContentState(mediaElement, false, null))
      .to.equal("PAUSED");
  });

  it("should be BUFFERING if not ended and stalled because of bufferring", () => {
    const fakeProps = {
      ended: false,
      duration: 10,
      currentTime: 5,
    };
    const mediaElement = fakeProps as HTMLMediaElement;
    expect(getLoadedContentState(mediaElement, true, {
      reason: "buffering",
    })).to.equal("BUFFERING");
    expect(getLoadedContentState(mediaElement, false, {
      reason: "buffering",
    })).to.equal("BUFFERING");
  });

  it("should be BUFFERING if not ended and stalled because of `not-ready`", () => {
    const fakeProps = {
      ended: false,
      duration: 10,
      currentTime: 5,
    };
    const mediaElement = fakeProps as HTMLMediaElement;
    expect(getLoadedContentState(mediaElement, true, {
      reason: "not-ready",
    })).to.equal("BUFFERING");
    expect(getLoadedContentState(mediaElement, false, {
      reason: "not-ready",
    })).to.equal("BUFFERING");
  });

  it("should be SEEKING if not ended and stalled because of `seeking`", () => {
    const fakeProps = {
      ended: false,
      duration: 10,
      currentTime: 5,
    };
    const mediaElement = fakeProps as HTMLMediaElement;
    expect(getLoadedContentState(mediaElement, true, {
      reason: "seeking",
    })).to.equal("SEEKING");
    expect(getLoadedContentState(mediaElement, false, {
      reason: "seeking",
    })).to.equal("SEEKING");
  });

  it("should be ENDED if stalled and currentTime is equal to duration", () => {
    const fakeProps = {
      ended: false,
      duration: 10,
      currentTime: 10,
    };
    const mediaElement = fakeProps as HTMLMediaElement;
    expect(getLoadedContentState(mediaElement, true, {
      reason: "seeking",
    })).to.equal("ENDED");
    expect(getLoadedContentState(mediaElement, false, {
      reason: "seeking",
    })).to.equal("ENDED");
    expect(getLoadedContentState(mediaElement, true, {
      reason: "buffering",
    })).to.equal("ENDED");
    expect(getLoadedContentState(mediaElement, false, {
      reason: "buffering",
    })).to.equal("ENDED");
    expect(getLoadedContentState(mediaElement, true, {
      reason: "not-ready",
    })).to.equal("ENDED");
    expect(getLoadedContentState(mediaElement, false, {
      reason: "not-ready",
    })).to.equal("ENDED");
  });

  it("should be ENDED if stalled and currentTime is very close to the duration", () => {
    const fakeProps = {
      ended: false,
      duration: 10,
      currentTime: 10 - config.FORCED_ENDED_THRESHOLD,
    };
    const mediaElement = fakeProps as HTMLMediaElement;
    expect(getLoadedContentState(mediaElement, true, {
      reason: "seeking",
    })).to.equal("ENDED");
    expect(getLoadedContentState(mediaElement, false, {
      reason: "seeking",
    })).to.equal("ENDED");
    expect(getLoadedContentState(mediaElement, true, {
      reason: "buffering",
    })).to.equal("ENDED");
    expect(getLoadedContentState(mediaElement, false, {
      reason: "buffering",
    })).to.equal("ENDED");
    expect(getLoadedContentState(mediaElement, true, {
      reason: "not-ready",
    })).to.equal("ENDED");
    expect(getLoadedContentState(mediaElement, false, {
      reason: "not-ready",
    })).to.equal("ENDED");
  });

  it("should be ENDED if stalled and currentTime is very close to the duration", () => {
    const fakeProps1 = {
      ended: false,
      duration: 10,
      currentTime: 10 - config.FORCED_ENDED_THRESHOLD,
    };
    const mediaElement1 = fakeProps1 as HTMLMediaElement;
    expect(getLoadedContentState(mediaElement1, true, {
      reason: "seeking",
    })).to.equal("ENDED");
    expect(getLoadedContentState(mediaElement1, false, {
      reason: "seeking",
    })).to.equal("ENDED");
    expect(getLoadedContentState(mediaElement1, true, {
      reason: "buffering",
    })).to.equal("ENDED");
    expect(getLoadedContentState(mediaElement1, false, {
      reason: "buffering",
    })).to.equal("ENDED");
    expect(getLoadedContentState(mediaElement1, true, {
      reason: "not-ready",
    })).to.equal("ENDED");
    expect(getLoadedContentState(mediaElement1, false, {
      reason: "not-ready",
    })).to.equal("ENDED");

    const fakeProps2 = {
      ended: false,
      duration: 10,
      currentTime: config.FORCED_ENDED_THRESHOLD + 10,
    };
    const mediaElement2 = fakeProps2 as HTMLMediaElement;
    expect(getLoadedContentState(mediaElement2, true, {
      reason: "seeking",
    })).to.equal("ENDED");
    expect(getLoadedContentState(mediaElement2, false, {
      reason: "seeking",
    })).to.equal("ENDED");
    expect(getLoadedContentState(mediaElement2, true, {
      reason: "buffering",
    })).to.equal("ENDED");
    expect(getLoadedContentState(mediaElement2, false, {
      reason: "buffering",
    })).to.equal("ENDED");
    expect(getLoadedContentState(mediaElement2, true, {
      reason: "not-ready",
    })).to.equal("ENDED");
    expect(getLoadedContentState(mediaElement2, false, {
      reason: "not-ready",
    })).to.equal("ENDED");
  });
});
