import { describe, it, expect } from "vitest";
import NativeTextDisplayer from "../../../main_thread/text_displayer/native/index.ts";
import ttmlParser from "../../../parsers/texttracks/ttml/native/index.ts";
import type { IFeaturesObject } from "../../types.ts";
import addNativettmlFeature from "../native_ttml_parser.ts";

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
