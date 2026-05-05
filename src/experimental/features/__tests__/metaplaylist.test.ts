import { describe, it, expect } from "vitest";
import initializeCoreEntry from "../../../core/entry/index.ts";
import type { IFeaturesObject } from "../../../features/types.ts";
import { MonoThreadCoreInterface } from "../../../main_thread/core_interface/monothread.ts";
import MediaSourceContentInitializer from "../../../main_thread/init/media_source_content_initializer.ts";
import metaplaylist from "../../../transports/metaplaylist/index.ts";
import addLocalManifestFeature from "../metaplaylist.ts";

describe("Features list - METAPLAYLIST", () => {
  it("should add METAPLAYLIST in the current features", () => {
    const featureObject = { transports: {} } as unknown as IFeaturesObject;
    addLocalManifestFeature(featureObject);
    expect(featureObject).toEqual({
      transports: { metaplaylist },
      monothread: {
        init: MediaSourceContentInitializer,
        coreInterface: MonoThreadCoreInterface,
        initializeCoreEntry,
      },
    });
    expect(featureObject.transports.metaplaylist).toBe(metaplaylist);
    expect(featureObject.monothread).not.toBe(null);
    expect(featureObject.monothread?.init).toBe(MediaSourceContentInitializer);
    expect(featureObject.monothread?.coreInterface).toBe(MonoThreadCoreInterface);
    expect(featureObject.monothread?.initializeCoreEntry).toBe(initializeCoreEntry);
  });
});
