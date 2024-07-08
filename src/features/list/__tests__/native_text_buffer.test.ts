import { describe, it, expect } from "vitest";
import NativeTextDisplayer from "../../../main_thread/text_displayer/native";
import type { IFeaturesObject } from "../../types";
import addNativeTextBuffer from "../native_text_buffer";

describe("Features list - native Text Buffer", () => {
  it("should add an native Text Buffer in the current features", () => {
    const featureObject = {} as unknown as IFeaturesObject;
    addNativeTextBuffer(featureObject);
    expect(featureObject).toEqual({ nativeTextDisplayer: NativeTextDisplayer });
    expect(featureObject.nativeTextDisplayer).toBe(NativeTextDisplayer);
  });
});
