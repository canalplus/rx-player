import { describe, it, expect } from "vitest";
import addNativesamiFeature from "../../../../../src/features/list/native_sami_parser.ts";
import type { IFeaturesObject } from "../../../../../src/features/types.ts";
import NativeTextDisplayer from "../../../../../src/main_thread/text_displayer/native/index.ts";
import samiParser from "../../../../../src/parsers/texttracks/sami/native.ts";

describe("Features list - native sami Parser", () => {
  it("should add an native sami Parser in the current features", () => {
    const featureObject = {
      nativeTextTracksParsers: {},
    } as unknown as IFeaturesObject;
    addNativesamiFeature(featureObject);
    expect(featureObject).toEqual({
      nativeTextTracksParsers: { sami: samiParser },
      nativeTextDisplayer: NativeTextDisplayer,
    });
    expect(featureObject.nativeTextTracksParsers.sami).toBe(samiParser);
    expect(featureObject.nativeTextDisplayer).toBe(NativeTextDisplayer);
  });
});
