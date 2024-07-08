import { describe, it, expect } from "vitest";
import NativeTextDisplayer from "../../../main_thread/text_displayer/native";
import samiParser from "../../../parsers/texttracks/sami/native";
import type { IFeaturesObject } from "../../types";
import addNativesamiFeature from "../native_sami_parser";

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
