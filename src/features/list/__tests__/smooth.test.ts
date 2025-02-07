import { describe, it, expect } from "vitest";
import initializeCoreEntry from "../../../core/entry";
import { MonoThreadCoreInterface } from "../../../main_thread/core_interface/monothread";
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
      monothread: {
        init: MediaSourceContentInitializer,
        coreInterface: MonoThreadCoreInterface,
        initializeCoreEntry,
      },
    });
    expect(featureObject.transports.smooth).toBe(SmoothFeature);
    expect(featureObject.monothread).not.toBe(null);
    expect(featureObject.monothread?.init).toBe(MediaSourceContentInitializer);
    expect(featureObject.monothread?.coreInterface).toBe(MonoThreadCoreInterface);
    expect(featureObject.monothread?.initializeCoreEntry).toBe(initializeCoreEntry);
  });
});
