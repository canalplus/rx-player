import { describe, it, expect } from "vitest";
import MultiThreadContentInitializer from "../../../main_thread/init/multi_thread_content_initializer";
import nativeDashParser from "../../../parsers/manifest/dash/native-parser";
import DASHFeature from "../../../transports/dash";
import type { IFeaturesObject } from "../../types";
import addDASHFeature from "../dash";

describe("Features list - DASH", () => {
  it("should add DASH in the current features", () => {
    const featureObject = {
      transports: {},
      dashParsers: { fastJs: null, native: null, wasm: null },
      mainThreadMediaSourceInit: null,
    } as unknown as IFeaturesObject;
    addDASHFeature(featureObject);
    expect(featureObject).toEqual({
      transports: { dash: DASHFeature },
      dashParsers: { native: nativeDashParser, fastJs: null, wasm: null },
      mainThreadMediaSourceInit: MultiThreadContentInitializer,
    });
    expect(featureObject.transports.dash).toBe(DASHFeature);
    expect(featureObject.mainThreadMediaSourceInit).toBe(MultiThreadContentInitializer);
  });
});
