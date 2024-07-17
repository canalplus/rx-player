import { describe, it, expect } from "vitest";
import MediaSourceContentInitializer from "../../../main_thread/init/media_source_content_initializer";
import SmoothFeature from "../../../transports/smooth";
import type { IFeaturesObject } from "../../types";
import addSmoothFeature from "../smooth";

describe("Features list - Smooth", () => {
  it("should add Smooth in the current features", () => {
    const featureObject = { transports: {} } as unknown as IFeaturesObject;
    addSmoothFeature(featureObject);
    expect(featureObject).toEqual({
      transports: { smooth: SmoothFeature },
      mainThreadMediaSourceInit: MediaSourceContentInitializer,
    });
    expect(featureObject.transports.smooth).toBe(SmoothFeature);
    expect(featureObject.mainThreadMediaSourceInit).toBe(MediaSourceContentInitializer);
  });
});
