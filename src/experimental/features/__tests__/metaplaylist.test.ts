import { describe, it, expect } from "vitest";
import initializeWorkerMain from "../../../core/main/worker";
import type { IFeaturesObject } from "../../../features/types";
import { MonoThreadCoreInterface } from "../../../main_thread/core_interface/monothread";
import MultiThreadContentInitializer from "../../../main_thread/init/multi_thread_content_initializer";
import metaplaylist from "../../../transports/metaplaylist";
import addLocalManifestFeature from "../metaplaylist";

describe("Features list - METAPLAYLIST", () => {
  it("should add METAPLAYLIST in the current features", () => {
    const featureObject = { transports: {} } as unknown as IFeaturesObject;
    addLocalManifestFeature(featureObject);
    expect(featureObject).toEqual({
      transports: { metaplaylist },
      monothread: {
        init: MultiThreadContentInitializer,
        coreInterface: MonoThreadCoreInterface,
        workerMain: initializeWorkerMain,
      },
    });
    expect(featureObject.transports.metaplaylist).toBe(metaplaylist);
    expect(featureObject.monothread).not.toBe(null);
    expect(featureObject.monothread?.init).toBe(MultiThreadContentInitializer);
    expect(featureObject.monothread?.coreInterface).toBe(MonoThreadCoreInterface);
    expect(featureObject.monothread?.workerMain).toBe(initializeWorkerMain);
  });
});
