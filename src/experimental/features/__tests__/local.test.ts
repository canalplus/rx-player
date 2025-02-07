import { describe, it, expect } from "vitest";
import initializeWorkerMain from "../../../core/main/worker";
import type { IFeaturesObject } from "../../../features/types";
import { MonoThreadCoreInterface } from "../../../main_thread/core_interface/monothread";
import MediaSourceContentInitializer from "../../../main_thread/init/media_source_content_initializer";
import local from "../../../transports/local";
import addLocalManifestFeature from "../local";

describe("Features list - LOCAL_MANIFEST", () => {
  it("should add LOCAL_MANIFEST in the current features", () => {
    const featureObject = { transports: {} } as unknown as IFeaturesObject;
    addLocalManifestFeature(featureObject);
    expect(featureObject).toEqual({
      transports: { local },
      monothread: {
        init: MediaSourceContentInitializer,
        coreInterface: MonoThreadCoreInterface,
        workerMain: initializeWorkerMain,
      },
    });
    expect(featureObject.transports.local).toBe(local);
    expect(featureObject.monothread).not.toBe(null);
    expect(featureObject.monothread?.init).toBe(MediaSourceContentInitializer);
    expect(featureObject.monothread?.coreInterface).toBe(MonoThreadCoreInterface);
    expect(featureObject.monothread?.workerMain).toBe(initializeWorkerMain);
  });
});
