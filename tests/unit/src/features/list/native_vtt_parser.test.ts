import { describe, it, expect } from "vitest";
import addNativevttFeature from "../../../../../src/features/list/native_vtt_parser.ts";
import type { IFeaturesObject } from "../../../../../src/features/types.ts";
import NativeTextDisplayer from "../../../../../src/main_thread/text_displayer/native/index.ts";
import {
  parseMp4EmbeddedWebVttToVTTCues,
  parseWebVTTPlainTextToVTTCues,
} from "../../../../../src/parsers/texttracks/webvtt/native/index.ts";

describe("Features list - native vtt Parser", () => {
  it("should add an native vtt Parser in the current features", () => {
    const featureObject = {
      nativeTextTracksParsers: {},
    } as unknown as IFeaturesObject;
    addNativevttFeature(featureObject);
    expect(featureObject).toEqual({
      nativeTextTracksParsers: {
        vtt: parseWebVTTPlainTextToVTTCues,
        mp4vtt: parseMp4EmbeddedWebVttToVTTCues,
      },
      nativeTextDisplayer: NativeTextDisplayer,
    });
    expect(featureObject.nativeTextTracksParsers.vtt).toBe(parseWebVTTPlainTextToVTTCues);
    expect(featureObject.nativeTextTracksParsers.mp4vtt).toBe(
      parseMp4EmbeddedWebVttToVTTCues,
    );
  });
});
