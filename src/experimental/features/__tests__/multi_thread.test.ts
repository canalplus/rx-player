import { describe, it, expect } from "vitest";
import type { IFeaturesObject } from "../../../features/types";
import { WorkerCoreInterface } from "../../../main_thread/core_interface/multithread";
import MediaSourceContentInitializer from "../../../main_thread/init/media_source_content_initializer";
import addMultiThreadFeature from "../multi_thread";

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
