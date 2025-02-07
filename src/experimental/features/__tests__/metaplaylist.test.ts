import { describe, it, expect } from "vitest";
import initializeCoreEntry from "../../../core/entry";
import type { IFeaturesObject } from "../../../features/types";
import { MonoThreadCoreInterface } from "../../../main_thread/core_interface/monothread";
import MediaSourceContentInitializer from "../../../main_thread/init/media_source_content_initializer";
import metaplaylist from "../../../transports/metaplaylist";
import addLocalManifestFeature from "../metaplaylist";

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
