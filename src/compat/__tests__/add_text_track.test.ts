import { describe, beforeEach, afterEach, it, expect, vi } from "vitest";
import type { IMediaElement } from "../../compat/browser_compatibility_types";
import addTextTrack from "../add_text_track";
import EnvDetector, { mockEnvironment, resetEnvironment } from "../env_detector";

describe("compat - addTextTrack", () => {
  beforeEach(() => {
    vi.resetModules();
  });
  afterEach(() => {
    resetEnvironment();
  });

  it("should re-use text track on old IE / EDGE", () => {
    const fakeTextTrack = {
      id: "textTrack1",
      HIDDEN: "hidden",
      SHOWING: "showing",
    } as unknown as TextTrack;
    const mockAddTextTrack = vi.fn(() => null);
    const fakeMediaElement = {
      textTracks: [fakeTextTrack],
      addTextTrack: mockAddTextTrack,
    } as unknown as IMediaElement;

    mockEnvironment(
      EnvDetector.BROWSERS.OtherIeOrEdgePreEdgeChromium,
      EnvDetector.DEVICES.Other,
    );
    const { track, trackElement } = addTextTrack(fakeMediaElement);
    expect(trackElement).toBe(undefined);
    expect(track).toBe(fakeTextTrack);
    expect(track.mode).toBe("showing");
    expect(mockAddTextTrack).not.toHaveBeenCalled();
  });

  it("should re-use text track on IE11", () => {
    const fakeTextTrack = {
      id: "textTrack1",
      HIDDEN: "hidden",
      SHOWING: "showing",
    } as unknown as TextTrack;
    const mockAddTextTrack = vi.fn(() => null);
    const fakeMediaElement = {
      textTracks: [fakeTextTrack],
      addTextTrack: mockAddTextTrack,
    } as unknown as IMediaElement;

    mockEnvironment(EnvDetector.BROWSERS.Ie11, EnvDetector.DEVICES.Other);
    const { track, trackElement } = addTextTrack(fakeMediaElement);
    expect(trackElement).toBe(undefined);
    expect(track).toBe(fakeTextTrack);
    expect(track.mode).toBe("showing");
    expect(mockAddTextTrack).not.toHaveBeenCalled();
  });

  it("should add text track if no track on media element on old IE / EDGE", () => {
    const fakeTextTrack = {
      id: "textTrack1",
      HIDDEN: "hidden",
      SHOWING: "showing",
    } as unknown as TextTrack;
    const fakeTextTracks: TextTrack[] = [];
    const mockAddTextTrack = vi.fn(() => {
      fakeTextTracks.push(fakeTextTrack);
      return fakeTextTrack;
    });

    const fakeMediaElement = {
      textTracks: fakeTextTracks,
      addTextTrack: mockAddTextTrack,
    } as unknown as IMediaElement;

    mockEnvironment(
      EnvDetector.BROWSERS.OtherIeOrEdgePreEdgeChromium,
      EnvDetector.DEVICES.Other,
    );

    const { track, trackElement } = addTextTrack(fakeMediaElement);
    expect(trackElement).toBe(undefined);
    expect(track).toBe(fakeTextTrack);
    expect(fakeMediaElement.textTracks.length).toBe(1);
    expect(fakeMediaElement.textTracks[0]).toBe(fakeTextTrack);
    expect(track.mode).toBe("showing");
    expect(mockAddTextTrack).toHaveBeenCalledTimes(1);
  });

  it("should add text track if no track on media element on IE11", () => {
    const fakeTextTrack = {
      id: "textTrack1",
      HIDDEN: "hidden",
      SHOWING: "showing",
    } as unknown as TextTrack;
    const fakeTextTracks: TextTrack[] = [];
    const mockAddTextTrack = vi.fn(() => {
      fakeTextTracks.push(fakeTextTrack);
      return fakeTextTrack;
    });

    const fakeMediaElement = {
      textTracks: fakeTextTracks,
      addTextTrack: mockAddTextTrack,
    } as unknown as IMediaElement;

    mockEnvironment(EnvDetector.BROWSERS.Ie11, EnvDetector.DEVICES.Other);

    const { track, trackElement } = addTextTrack(fakeMediaElement);
    expect(trackElement).toBe(undefined);
    expect(track).toBe(fakeTextTrack);
    expect(fakeMediaElement.textTracks.length).toBe(1);
    expect(fakeMediaElement.textTracks[0]).toBe(fakeTextTrack);
    expect(track.mode).toBe("showing");
    expect(mockAddTextTrack).toHaveBeenCalledTimes(1);
  });

  it("should create showing trackElement and set track on mediaElement", () => {
    mockEnvironment(EnvDetector.BROWSERS.Firefox, EnvDetector.DEVICES.Other);

    const fakeTextTrack = {
      id: "textTrack1",
      HIDDEN: "hidden",
      SHOWING: "showing",
    };
    const fakeTextTrackElement = {
      track: fakeTextTrack,
      kind: undefined,
    };

    const fakeTextTracks: TextTrack[] = [];
    const fakeChildNodes: ChildNode[] = [];

    const mockAppendChild = vi.fn((_trackElement: HTMLTrackElement) => {
      fakeChildNodes.push(_trackElement);
      fakeTextTracks.push(_trackElement.track);
    });

    const fakeMediaElement = {
      textTracks: fakeTextTracks,
      appendChild: mockAppendChild,
      childNodes: fakeChildNodes,
    } as unknown as IMediaElement;

    const spyOnCreateElement = vi
      .spyOn(document, "createElement")
      .mockImplementation(() => fakeTextTrackElement as unknown as HTMLElement);

    const { track, trackElement } = addTextTrack(fakeMediaElement);
    expect(track).toBe(fakeTextTrack);
    expect(track.mode).toBe("showing");
    expect(trackElement).toBe(fakeTextTrackElement);
    expect(fakeMediaElement.textTracks[0]).toBe(fakeTextTrack);
    expect(fakeMediaElement.childNodes[0]).toBe(fakeTextTrackElement);
    expect(spyOnCreateElement).toHaveBeenCalledTimes(1);
    expect(mockAppendChild).toHaveBeenCalledTimes(1);
    spyOnCreateElement.mockReset();
  });
});
