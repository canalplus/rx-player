import { describe, it, expect } from "vitest";
import type { IFeaturesObject } from "../../../features/types.ts";
import { WorkerCoreInterface } from "../../../main_thread/core_interface/multithread.ts";
import MediaSourceContentInitializer from "../../../main_thread/init/media_source_content_initializer.ts";
import addMultiThreadFeature from "../multi_thread.ts";

describe("Features list - EME", () => {
  it("should add the ContentDecryptor in the current features", () => {
    const featureObject: IFeaturesObject = {} as IFeaturesObject;
    addMultiThreadFeature(featureObject);
    expect(featureObject).toEqual({
      multithread: {
        init: MediaSourceContentInitializer,
        coreInterface: WorkerCoreInterface,
      },
    });
    expect(featureObject.multithread).not.toBe(null);
    expect(featureObject.multithread).not.toBe(undefined);
    expect(featureObject.multithread?.init).toBe(MediaSourceContentInitializer);
    expect(featureObject.multithread?.coreInterface).toBe(WorkerCoreInterface);
  });
});
