import { describe, it, expect } from "vitest";
import NativeTextDisplayer from "../../../main_thread/text_displayer/native/index.ts";
import srtParser from "../../../parsers/texttracks/srt/native.ts";
import type { IFeaturesObject } from "../../types.ts";
import addNativesrtFeature from "../native_srt_parser.ts";

describe("Features list - native srt Parser", () => {
  it("should add an native srt Parser in the current features", () => {
    const featureObject = {
      nativeTextTracksParsers: {},
    } as unknown as IFeaturesObject;
    addNativesrtFeature(featureObject);
    expect(featureObject).toEqual({
      nativeTextTracksParsers: { srt: srtParser },
      nativeTextDisplayer: NativeTextDisplayer,
    });
    expect(featureObject.nativeTextTracksParsers.srt).toBe(srtParser);
  });
});
