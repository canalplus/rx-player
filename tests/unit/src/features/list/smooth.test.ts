import { describe, it, expect } from "vitest";
import initializeCoreEntry from "../../../../../src/core/entry/index.ts";
import addSmoothFeature from "../../../../../src/features/list/smooth.ts";
import type { IFeaturesObject } from "../../../../../src/features/types.ts";
import { MonoThreadCoreInterface } from "../../../../../src/main_thread/core_interface/monothread.ts";
import MediaSourceContentInitializer from "../../../../../src/main_thread/init/media_source_content_initializer.ts";
import SmoothFeature from "../../../../../src/transports/smooth/index.ts";

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
