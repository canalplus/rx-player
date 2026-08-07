import { describe, it, expect } from "vitest";
import addNativettmlFeature from "../../../../../src/features/list/native_ttml_parser.ts";
import type { IFeaturesObject } from "../../../../../src/features/types.ts";
import NativeTextDisplayer from "../../../../../src/main_thread/text_displayer/native/index.ts";
import ttmlParser from "../../../../../src/parsers/texttracks/ttml/native/index.ts";

describe("Features list - native ttml Parser", () => {
  it("should add an native ttml Parser in the current features", () => {
    const featureObject = {
      nativeTextTracksParsers: {},
    } as unknown as IFeaturesObject;
    addNativettmlFeature(featureObject);
    expect(featureObject).toEqual({
      nativeTextTracksParsers: { ttml: ttmlParser },
      nativeTextDisplayer: NativeTextDisplayer,
    });
    expect(featureObject.nativeTextTracksParsers.ttml).toBe(ttmlParser);
  });
});
