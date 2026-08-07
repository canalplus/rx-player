import { describe, it, expect } from "vitest";
import addNativeTextBuffer from "../../../../../src/features/list/native_text_buffer.ts";
import type { IFeaturesObject } from "../../../../../src/features/types.ts";
import NativeTextDisplayer from "../../../../../src/main_thread/text_displayer/native/index.ts";

describe("Features list - native Text Buffer", () => {
  it("should add an native Text Buffer in the current features", () => {
    const featureObject = {} as unknown as IFeaturesObject;
    addNativeTextBuffer(featureObject);
    expect(featureObject).toEqual({ nativeTextDisplayer: NativeTextDisplayer });
    expect(featureObject.nativeTextDisplayer).toBe(NativeTextDisplayer);
  });
});
