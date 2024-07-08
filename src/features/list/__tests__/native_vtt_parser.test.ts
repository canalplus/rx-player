import { describe, it, expect } from "vitest";
import NativeTextDisplayer from "../../../main_thread/text_displayer/native";
import vttParser from "../../../parsers/texttracks/webvtt/native";
import type { IFeaturesObject } from "../../types";
import addNativevttFeature from "../native_vtt_parser";

describe("Features list - native vtt Parser", () => {
  it("should add an native vtt Parser in the current features", () => {
    const featureObject = {
      nativeTextTracksParsers: {},
    } as unknown as IFeaturesObject;
    addNativevttFeature(featureObject);
    expect(featureObject).toEqual({
      nativeTextTracksParsers: { vtt: vttParser },
      nativeTextDisplayer: NativeTextDisplayer,
    });
    expect(featureObject.nativeTextTracksParsers.vtt).toBe(vttParser);
  });
});
