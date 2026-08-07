import { describe, it, expect } from "vitest";
import type { IMediaElement } from "../../../../../src/compat/browser_compatibility_types.ts";
import MediaElementTracksStore from "../../../../../src/main_thread/tracks_store/media_element_tracks_store.ts";
import assert from "../../../../../src/utils/assert.ts";

type TrackListEventName = "addtrack" | "removetrack" | "change";

type FakeTrackList<TTrack, TEvent = Event> = TTrack[] & {
  addEventListener(evt: TrackListEventName, fn: (evt: TEvent) => void): void;
  removeEventListener(evt: TrackListEventName, fn: (evt: TEvent) => void): void;
  trigger(evt: TrackListEventName, payload: TEvent): void;
};

type IFakeMediaElement = IMediaElement & {
  readonly audioTracks: FakeTrackList<{ language: string; enabled: boolean }>;
  readonly textTracks: FakeTrackList<TextTrack, TrackEvent>;
  readonly videoTracks: FakeTrackList<{ language: string; selected: boolean }>;
};

function createFakeTrackList<TTrack, TEvent = Event>(
  tracks: TTrack[],
): FakeTrackList<TTrack, TEvent> {
  const listeners: Record<TrackListEventName, Array<(evt: TEvent) => void>> = {
    addtrack: [],
    removetrack: [],
    change: [],
  };
  const trackList = tracks as FakeTrackList<TTrack, TEvent>;
  trackList.addEventListener = (evt, fn) => {
    listeners[evt].push(fn);
  };
  trackList.removeEventListener = (evt, fn) => {
    listeners[evt] = listeners[evt].filter((listener) => listener !== fn);
  };
  trackList.trigger = (evt, payload) => {
    listeners[evt].forEach((listener) => listener(payload));
  };
  return trackList;
}

function createFakeMediaElement(): IFakeMediaElement {
  const audioTracks = createFakeTrackList([
    { language: "en", enabled: false },
    { language: "fr", enabled: true },
    { language: "el", enabled: false },
    { language: "pt-BR", enabled: false },
  ]);
  const textTracks = createFakeTrackList<TextTrack, TrackEvent>([
    { language: "en", mode: "hidden" },
    { language: "fr", mode: "showing" },
    { language: "el", mode: "hidden" },
    { language: "pt-BR", mode: "hidden" },
  ] as TextTrack[]);
  const videoTracks = createFakeTrackList([{ language: "", selected: true }]);
  const fakeMediaElement = {} as IFakeMediaElement;
  Object.defineProperties(fakeMediaElement, {
    audioTracks: { get: () => audioTracks },
    textTracks: { get: () => textTracks },
    videoTracks: { get: () => videoTracks },
  });
  return fakeMediaElement;
}

describe("API - MediaElementTracksStore", () => {
  it("should returns correct results for getter", () => {
    const fakeMediaElement = createFakeMediaElement();
    const trackManager = new MediaElementTracksStore(fakeMediaElement);
    const audioTracks = trackManager.getAvailableAudioTracks();
    const textTracks = trackManager.getAvailableTextTracks();
    const videoTracks = trackManager.getAvailableVideoTracks();
    expect(audioTracks).toBeDefined();
    expect(audioTracks?.length).toBe(4);
    expect(videoTracks).toBeDefined();
    expect(videoTracks?.length).toBe(1);
    expect(textTracks).toBeDefined();
    expect(textTracks?.length).toBe(4);

    const chosenAudioTrack = trackManager.getChosenAudioTrack();
    const chosenTextTrack = trackManager.getChosenTextTrack();
    const chosenVideoTrack = trackManager.getChosenVideoTrack();
    expect(chosenAudioTrack).toEqual({
      id: "gen_audio_fr_1",
      language: "fr",
      audioDescription: false,
      normalized: "fra",
      representations: [],
    });
    expect(chosenVideoTrack).toEqual({
      id: "gen_video_nolang_1",
      representations: [],
    });
    expect(chosenTextTrack).toEqual({
      id: "gen_text_fr_1",
      language: "fr",
      closedCaption: false,
      normalized: "fra",
    });
  });
  it("should returns correct results for setters", () => {
    const fakeMediaElement = createFakeMediaElement();
    const trackManager = new MediaElementTracksStore(fakeMediaElement);

    trackManager.setAudioTrackById("gen_audio_en_1");
    // unset enabled attribute of other track, as browser is supported to do this
    assert(fakeMediaElement.audioTracks !== undefined);
    fakeMediaElement.audioTracks[1].enabled = false;
    expect(trackManager.getChosenAudioTrack()).toEqual({
      id: "gen_audio_en_1",
      language: "en",
      audioDescription: false,
      normalized: "eng",
      representations: [],
    });

    trackManager.setTextTrackById("gen_text_en_1");
    // changed mode attribute of other track, as browser is supported to do this
    assert(fakeMediaElement.textTracks !== undefined);
    fakeMediaElement.textTracks[1].mode = "hidden";
    expect(trackManager.getChosenTextTrack()).toEqual({
      id: "gen_text_en_1",
      language: "en",
      closedCaption: false,
      normalized: "eng",
    });
  });
  it("should emit available tracks change when changing text contents", () => {
    const fakeMediaElement = createFakeMediaElement();
    const trackManager = new MediaElementTracksStore(fakeMediaElement);

    return new Promise<void>((res) => {
      trackManager.addEventListener("availableTextTracksChange", (tracks) => {
        expect(tracks.length).toBe(5);
        expect(tracks[0].id).toBe("gen_text_es_1");
        expect(tracks[1].id).toBe("gen_text_en_1");
        expect(tracks[2].id).toBe("gen_text_fr_1");
        expect(tracks[3].id).toBe("gen_text_el_1");
        expect(tracks[4].id).toBe("gen_text_pt-BR_1");
        res();
      });

      // Fake browser behavior
      fakeMediaElement.textTracks.unshift({
        language: "es",
        mode: "hidden",
      } as TextTrack);
      fakeMediaElement.textTracks.trigger("addtrack", {} as TrackEvent);
    });
  });

  it("should emit available tracks change when changing video contents", () => {
    const fakeMediaElement = createFakeMediaElement();
    const trackManager = new MediaElementTracksStore(fakeMediaElement);
    return new Promise<void>((res) => {
      trackManager.addEventListener("availableVideoTracksChange", (tracks) => {
        expect(tracks.length).toBe(2);
        expect(tracks[0].id).toBe("gen_video_en_1");
        expect(tracks[1].id).toBe("gen_video_nolang_1");
        res();
      });

      // Fake browser behavior
      fakeMediaElement.videoTracks.unshift({ language: "en", selected: false });
      fakeMediaElement.videoTracks.trigger("addtrack", {} as Event);
    });
  });

  it("should emit available tracks change when changing audio contents", () => {
    const fakeMediaElement = createFakeMediaElement();
    const trackManager = new MediaElementTracksStore(fakeMediaElement);
    return new Promise<void>((res) => {
      trackManager.addEventListener("availableAudioTracksChange", (tracks) => {
        expect(tracks.length).toBe(5);
        expect(tracks[0].id).toBe("gen_audio_en_1");
        expect(tracks[1].id).toBe("gen_audio_en_2");
        expect(tracks[2].id).toBe("gen_audio_fr_1");
        expect(tracks[3].id).toBe("gen_audio_el_1");
        expect(tracks[4].id).toBe("gen_audio_pt-BR_1");
        res();
      });

      // Fake browser behavior
      fakeMediaElement.audioTracks.unshift({ language: "en", enabled: false });
      fakeMediaElement.audioTracks.trigger("addtrack", {} as Event);
    });
  });

  it("should emit chosen track when changing text content", () => {
    const fakeMediaElement = createFakeMediaElement();
    const trackManager = new MediaElementTracksStore(fakeMediaElement);

    return new Promise<void>((res) => {
      trackManager.addEventListener("textTrackChange", (chosenTrack) => {
        expect(chosenTrack?.id).toBe("gen_text_en_1");
        res();
      });

      trackManager.setTextTrackById("gen_text_en_1");

      // Fake browser behavior
      fakeMediaElement.textTracks.trigger("change", undefined as unknown as TrackEvent);
    });
  });
});
