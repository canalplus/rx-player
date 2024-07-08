import { describe, beforeEach, it, expect, vi } from "vitest";

// Needed for calling require (which itself is needed to mock properly) because
// it is not type-checked:
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-explicit-any */

describe("compat - addTextTrack", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("should re-use text track on IE / EDGE", async () => {
    const fakeTextTrack = {
      id: "textTrack1",
      HIDDEN: "hidden",
      SHOWING: "showing",
    } as unknown as TextTrack;
    const mockAddTextTrack = vi.fn(() => null);
    const fakeMediaElement = {
      textTracks: [fakeTextTrack],
      addTextTrack: mockAddTextTrack,
    } as unknown as HTMLMediaElement;

    vi.doMock("../browser_detection", () => ({
      isIEOrEdge: true,
    }));
    const { default: addTextTrack } = (await vi.importActual("../add_text_track")) as any;
    const { track, trackElement } = addTextTrack(fakeMediaElement);
    expect(trackElement).toBe(undefined);
    expect(track).toBe(fakeTextTrack);
    expect(track.mode).toBe("showing");
    expect(mockAddTextTrack).not.toHaveBeenCalled();
  });

  it("should add text track if no track on media element on IE / EDGE", async () => {
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
    } as unknown as HTMLMediaElement;

    vi.doMock("../browser_detection", () => ({
      isIEOrEdge: true,
    }));

    const { default: addTextTrack } = (await vi.importActual("../add_text_track")) as any;
    const { track, trackElement } = addTextTrack(fakeMediaElement);
    expect(trackElement).toBe(undefined);
    expect(track).toBe(fakeTextTrack);
    expect(fakeMediaElement.textTracks.length).toBe(1);
    expect(fakeMediaElement.textTracks[0]).toBe(fakeTextTrack);
    expect(track.mode).toBe("showing");
    expect(mockAddTextTrack).toHaveBeenCalledTimes(1);
  });

  it("should create showing trackElement and set track on mediaElement", async () => {
    vi.doMock("../browser_detection", () => ({
      isIEOrEdge: false,
    }));
    const { default: addTextTrack } = (await vi.importActual("../add_text_track")) as any;

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

    const mockAppendChild = vi.fn((_trackElement) => {
      fakeChildNodes.push(_trackElement);
      fakeTextTracks.push(_trackElement.track);
    });

    const fakeMediaElement = {
      textTracks: fakeTextTracks,
      appendChild: mockAppendChild,
      childNodes: fakeChildNodes,
    } as unknown as HTMLMediaElement;

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
