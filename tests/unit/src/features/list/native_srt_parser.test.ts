import { describe, it, expect } from "vitest";
import addNativesrtFeature from "../../../../../src/features/list/native_srt_parser.ts";
import type { IFeaturesObject } from "../../../../../src/features/types.ts";
import NativeTextDisplayer from "../../../../../src/main_thread/text_displayer/native/index.ts";
import srtParser from "../../../../../src/parsers/texttracks/srt/native.ts";

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
