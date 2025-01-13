import { describe, it, expect } from "vitest";
import type { IFeaturesObject } from "../../../features/types";
import MultiThreadContentInitializer from "../../../main_thread/init/multi_thread_content_initializer";
import metaplaylist from "../../../transports/metaplaylist";
import addLocalManifestFeature from "../metaplaylist";

describe("Features list - METAPLAYLIST", () => {
  it("should add METAPLAYLIST in the current features", () => {
    const featureObject = { transports: {} } as unknown as IFeaturesObject;
    addLocalManifestFeature(featureObject);
    expect(featureObject).toEqual({
      transports: { metaplaylist },
      mainThreadMediaSourceInit: MultiThreadContentInitializer,
    });
    expect(featureObject.transports.metaplaylist).toBe(metaplaylist);
    expect(featureObject.mainThreadMediaSourceInit).toBe(MultiThreadContentInitializer);
  });
});
