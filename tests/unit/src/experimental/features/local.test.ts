import { describe, it, expect } from "vitest";
import initializeCoreEntry from "../../../../../src/core/entry/index.ts";
import addLocalManifestFeature from "../../../../../src/experimental/features/local.ts";
import type { IFeaturesObject } from "../../../../../src/features/types.ts";
import { MonoThreadCoreInterface } from "../../../../../src/main_thread/core_interface/monothread.ts";
import MediaSourceContentInitializer from "../../../../../src/main_thread/init/media_source_content_initializer.ts";
import local from "../../../../../src/transports/local/index.ts";

describe("Features list - LOCAL_MANIFEST", () => {
  it("should add LOCAL_MANIFEST in the current features", () => {
    const featureObject = { transports: {} } as unknown as IFeaturesObject;
    addLocalManifestFeature(featureObject);
    expect(featureObject).toEqual({
      transports: { local },
      monothread: {
        init: MediaSourceContentInitializer,
        coreInterface: MonoThreadCoreInterface,
        initializeCoreEntry,
      },
    });
    expect(featureObject.transports.local).toBe(local);
    expect(featureObject.monothread).not.toBe(null);
    expect(featureObject.monothread?.init).toBe(MediaSourceContentInitializer);
    expect(featureObject.monothread?.coreInterface).toBe(MonoThreadCoreInterface);
    expect(featureObject.monothread?.initializeCoreEntry).toBe(initializeCoreEntry);
  });
});
