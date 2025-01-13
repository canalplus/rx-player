import { describe, it, expect } from "vitest";
import type { IFeaturesObject } from "../../../features/types";
import MultiThreadContentInitializer from "../../../main_thread/init/multi_thread_content_initializer";
import local from "../../../transports/local";
import addLocalManifestFeature from "../local";

describe("Features list - LOCAL_MANIFEST", () => {
  it("should add LOCAL_MANIFEST in the current features", () => {
    const featureObject = { transports: {} } as unknown as IFeaturesObject;
    addLocalManifestFeature(featureObject);
    expect(featureObject).toEqual({
      transports: { local },
      mainThreadMediaSourceInit: MultiThreadContentInitializer,
    });
    expect(featureObject.transports.local).toBe(local);
    expect(featureObject.mainThreadMediaSourceInit).toBe(MultiThreadContentInitializer);
  });
});
