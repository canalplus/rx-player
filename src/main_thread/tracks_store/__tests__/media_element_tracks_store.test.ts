import { describe, it, expect } from "vitest";
import type { IMediaElement } from "../../../compat/browser_compatibility_types";
import assert from "../../../utils/assert";
import MediaElementTracksStore from "../media_element_tracks_store";

const fakeMediaElement = {
  audioTracks: [
    { language: "en", enabled: false },
    { language: "fr", enabled: true },
    { language: "el", enabled: false },
    { language: "pt-BR", enabled: false },
  ],
  textTracks: [
    { language: "en", mode: "hidden" },
    { language: "fr", mode: "showing" },
    { language: "el", mode: "hidden" },
    { language: "pt-BR", mode: "hidden" },
  ],
  videoTracks: [{ language: "", selected: true }],
} as unknown as IMediaElement;

describe("API - MediaElementTracksStore", () => {
  it("should returns correct results for getter", () => {
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
      (fakeMediaElement.textTracks as unknown as TextTrack[]).unshift({
        language: "es",
        mode: "hidden",
      } as TextTrack);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      (
        fakeMediaElement.textTracks as {
          onaddtrack: ((arg: TrackEvent) => void) | undefined;
        }
      ).onaddtrack?.({} as TrackEvent);
    });
  });

  it("should emit available tracks change when changing video contents", () => {
    const trackManager = new MediaElementTracksStore(fakeMediaElement);
    return new Promise<void>((res) => {
      trackManager.addEventListener("availableVideoTracksChange", (tracks) => {
        expect(tracks.length).toBe(2);
        expect(tracks[0].id).toBe("gen_video_en_1");
        expect(tracks[1].id).toBe("gen_video_nolang_1");
        res();
      });

      // Fake browser behavior
      const _elt = fakeMediaElement;
      (
        _elt.videoTracks as unknown as Array<{
          language: string;
          selected: boolean;
        }>
      ).unshift({ language: "en", selected: false });
      _elt.videoTracks?.onaddtrack?.({} as TrackEvent);
    });
  });

  it("should emit available tracks change when changing audio contents", () => {
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
      const _elt = fakeMediaElement;
      (
        _elt.audioTracks as unknown as Array<{
          language: string;
          selected: boolean;
        }>
      ).unshift({ language: "en", selected: false });
      _elt.audioTracks?.onaddtrack?.({} as TrackEvent);
    });
  });

  it("should emit chosen track when changing text content", () => {
    const trackManager = new MediaElementTracksStore(fakeMediaElement);

    return new Promise<void>((res) => {
      trackManager.addEventListener("textTrackChange", (chosenTrack) => {
        expect(chosenTrack?.id).toBe("gen_text_fr_1");
        res();
      });

      trackManager.setTextTrackById("gen_text_fr_1");

      // Fake browser behavior
      fakeMediaElement.textTracks[0].mode = "hidden";
      (
        fakeMediaElement.textTracks as {
          onchange: ((arg: Event) => void) | undefined;
        }
      ).onchange?.(undefined as unknown as Event);
    });
  });
});
