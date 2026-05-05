import { describe, it, expect } from "vitest";
import type { IMediaElement } from "../../../compat/browser_compatibility_types.ts";
import config from "../../../config.ts";
import { getLoadedContentState } from "../utils.ts";

describe("API - getLoadedContentState", () => {
  it("should always return ENDED if mediaElement.ended is true", () => {
    const fakeProps = {
      ended: true,
      duration: 100000,
      currentTime: 0,
      paused: false,
    };
    const mediaElement = fakeProps as IMediaElement;

    // we can just do every possibility here
    expect(getLoadedContentState(mediaElement, null, false, "STOPPED")).toBe("ENDED");
    fakeProps.paused = true;
    expect(getLoadedContentState(mediaElement, null, false, "STOPPED")).toBe("ENDED");
    expect(getLoadedContentState(mediaElement, "seeking", false, "STOPPED")).toBe(
      "ENDED",
    );
    expect(getLoadedContentState(mediaElement, "not-ready", false, "STOPPED")).toBe(
      "ENDED",
    );
    expect(getLoadedContentState(mediaElement, "buffering", false, "STOPPED")).toBe(
      "ENDED",
    );
    expect(getLoadedContentState(mediaElement, "freezing", false, "STOPPED")).toBe(
      "ENDED",
    );
    fakeProps.paused = false;
    expect(getLoadedContentState(mediaElement, "seeking", false, "STOPPED")).toBe(
      "ENDED",
    );
    expect(getLoadedContentState(mediaElement, "not-ready", false, "STOPPED")).toBe(
      "ENDED",
    );
    expect(getLoadedContentState(mediaElement, "buffering", false, "STOPPED")).toBe(
      "ENDED",
    );
    expect(getLoadedContentState(mediaElement, "freezing", false, "STOPPED")).toBe(
      "ENDED",
    );
  });

  it("should be PLAYING if not stalled nor ended and if not paused", () => {
    const fakeProps = {
      ended: false,
      duration: 10,
      currentTime: 10, // worst case -> currentTime === duration
      paused: false,
    };
    const mediaElement = fakeProps as IMediaElement;
    expect(getLoadedContentState(mediaElement, null, false, "STOPPED")).toBe("PLAYING");
  });

  it("should be PAUSED if not stalled nor ended and if paused", () => {
    const fakeProps = {
      ended: false,
      duration: 10,
      currentTime: 10, // worst case -> currentTime === duration
      paused: true,
    };
    const mediaElement = fakeProps as IMediaElement;
    expect(getLoadedContentState(mediaElement, null, false, "STOPPED")).toBe("PAUSED");
  });

  it("should be BUFFERING if not ended and stalled because of buffering", () => {
    const fakeProps = {
      ended: false,
      duration: 10,
      currentTime: 5,
      paused: false,
    };
    const mediaElement = fakeProps as IMediaElement;
    expect(getLoadedContentState(mediaElement, "buffering", false, "STOPPED")).toBe(
      "BUFFERING",
    );
    fakeProps.paused = true;
    expect(getLoadedContentState(mediaElement, "buffering", false, "STOPPED")).toBe(
      "BUFFERING",
    );
  });

  it("should be FREEZING if not ended and stalled because of freezing", () => {
    const fakeProps = {
      ended: false,
      duration: 10,
      currentTime: 5,
      paused: false,
    };
    const mediaElement = fakeProps as IMediaElement;
    expect(getLoadedContentState(mediaElement, "freezing", false, "STOPPED")).toBe(
      "FREEZING",
    );
    fakeProps.paused = true;
    expect(getLoadedContentState(mediaElement, "freezing", false, "STOPPED")).toBe(
      "FREEZING",
    );
  });

  it("should be BUFFERING if not ended and stalled because of `not-ready`", () => {
    const fakeProps = {
      ended: false,
      duration: 10,
      currentTime: 5,
      paused: false,
    };
    const mediaElement = fakeProps as IMediaElement;
    expect(getLoadedContentState(mediaElement, "not-ready", false, "STOPPED")).toBe(
      "BUFFERING",
    );
    fakeProps.paused = true;
    expect(getLoadedContentState(mediaElement, "not-ready", false, "STOPPED")).toBe(
      "BUFFERING",
    );
  });

  it("should be SEEKING if not ended and stalled because of `seeking`", () => {
    const fakeProps = {
      ended: false,
      duration: 10,
      currentTime: 5,
      paused: false,
    };
    const mediaElement = fakeProps as IMediaElement;
    expect(getLoadedContentState(mediaElement, "seeking", false, "STOPPED")).toBe(
      "SEEKING",
    );
    fakeProps.paused = true;
    expect(getLoadedContentState(mediaElement, "seeking", false, "STOPPED")).toBe(
      "SEEKING",
    );
  });

  it("should be ENDED if stalled and currentTime is equal to duration", () => {
    const fakeProps = {
      ended: false,
      duration: 10,
      currentTime: 10,
      paused: false,
    };
    const mediaElement = fakeProps as IMediaElement;
    expect(getLoadedContentState(mediaElement, "seeking", false, "STOPPED")).toBe(
      "ENDED",
    );
    expect(getLoadedContentState(mediaElement, "buffering", false, "STOPPED")).toBe(
      "ENDED",
    );
    expect(getLoadedContentState(mediaElement, "not-ready", false, "STOPPED")).toBe(
      "ENDED",
    );
    expect(getLoadedContentState(mediaElement, "freezing", false, "STOPPED")).toBe(
      "ENDED",
    );
    fakeProps.paused = true;
    expect(getLoadedContentState(mediaElement, "seeking", false, "STOPPED")).toBe(
      "ENDED",
    );
    expect(getLoadedContentState(mediaElement, "buffering", false, "STOPPED")).toBe(
      "ENDED",
    );
    expect(getLoadedContentState(mediaElement, "not-ready", false, "STOPPED")).toBe(
      "ENDED",
    );
    expect(getLoadedContentState(mediaElement, "freezing", false, "STOPPED")).toBe(
      "ENDED",
    );
  });

  it("should be ENDED if stalled and currentTime is very close to the duration", () => {
    const fakeProps = {
      ended: false,
      duration: 10,
      currentTime: 10 - config.getCurrent().FORCED_ENDED_THRESHOLD,
      paused: false,
    };
    const mediaElement = fakeProps as IMediaElement;
    expect(getLoadedContentState(mediaElement, "seeking", false, "STOPPED")).toBe(
      "ENDED",
    );
    expect(getLoadedContentState(mediaElement, "buffering", false, "STOPPED")).toBe(
      "ENDED",
    );
    expect(getLoadedContentState(mediaElement, "not-ready", false, "STOPPED")).toBe(
      "ENDED",
    );
    expect(getLoadedContentState(mediaElement, "freezing", false, "STOPPED")).toBe(
      "ENDED",
    );
    fakeProps.paused = true;
    expect(getLoadedContentState(mediaElement, "seeking", false, "STOPPED")).toBe(
      "ENDED",
    );
    expect(getLoadedContentState(mediaElement, "buffering", false, "STOPPED")).toBe(
      "ENDED",
    );
    expect(getLoadedContentState(mediaElement, "not-ready", false, "STOPPED")).toBe(
      "ENDED",
    );
    expect(getLoadedContentState(mediaElement, "freezing", false, "STOPPED")).toBe(
      "ENDED",
    );
  });
  it("should be ENDED if stalled and currentTime is very close to the duration", () => {
    const fakeProps1 = {
      ended: false,
      duration: 10,
      currentTime: 10 - config.getCurrent().FORCED_ENDED_THRESHOLD,
      paused: false,
    };
    const mediaElement1 = fakeProps1 as IMediaElement;
    expect(getLoadedContentState(mediaElement1, "seeking", false, "STOPPED")).toBe(
      "ENDED",
    );
    expect(getLoadedContentState(mediaElement1, "buffering", false, "STOPPED")).toBe(
      "ENDED",
    );
    expect(getLoadedContentState(mediaElement1, "not-ready", false, "STOPPED")).toBe(
      "ENDED",
    );
    expect(getLoadedContentState(mediaElement1, "freezing", false, "STOPPED")).toBe(
      "ENDED",
    );
    fakeProps1.paused = true;
    expect(getLoadedContentState(mediaElement1, "seeking", false, "STOPPED")).toBe(
      "ENDED",
    );
    expect(getLoadedContentState(mediaElement1, "buffering", false, "STOPPED")).toBe(
      "ENDED",
    );
    expect(getLoadedContentState(mediaElement1, "not-ready", false, "STOPPED")).toBe(
      "ENDED",
    );
    expect(getLoadedContentState(mediaElement1, "freezing", false, "STOPPED")).toBe(
      "ENDED",
    );

    const fakeProps2 = {
      ended: false,
      duration: 10,
      currentTime: config.getCurrent().FORCED_ENDED_THRESHOLD + 10,
      paused: false,
    };
    const mediaElement2 = fakeProps2 as IMediaElement;
    expect(getLoadedContentState(mediaElement2, "seeking", false, "STOPPED")).toBe(
      "ENDED",
    );
    expect(getLoadedContentState(mediaElement2, "buffering", false, "STOPPED")).toBe(
      "ENDED",
    );
    expect(getLoadedContentState(mediaElement2, "not-ready", false, "STOPPED")).toBe(
      "ENDED",
    );
    expect(getLoadedContentState(mediaElement2, "freezing", false, "STOPPED")).toBe(
      "ENDED",
    );
    fakeProps2.paused = true;
    expect(getLoadedContentState(mediaElement2, "seeking", false, "STOPPED")).toBe(
      "ENDED",
    );
    expect(getLoadedContentState(mediaElement2, "buffering", false, "STOPPED")).toBe(
      "ENDED",
    );
    expect(getLoadedContentState(mediaElement2, "not-ready", false, "STOPPED")).toBe(
      "ENDED",
    );
    expect(getLoadedContentState(mediaElement2, "freezing", false, "STOPPED")).toBe(
      "ENDED",
    );
  });
});
