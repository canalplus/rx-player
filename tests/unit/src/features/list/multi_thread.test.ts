import { describe, it, expect } from "vitest";
import addMultiThreadFeature from "../../../../../src/features/list/multi_thread.ts";
import type { IFeaturesObject } from "../../../../../src/features/types.ts";
import { WorkerCoreInterface } from "../../../../../src/main_thread/core_interface/multithread.ts";
import MediaSourceContentInitializer from "../../../../../src/main_thread/init/media_source_content_initializer.ts";

describe("Features list - MULTI_THREAD", () => {
  it("should add the multi-thread implementation to the current features", () => {
    const featureObject: IFeaturesObject = {} as IFeaturesObject;
    addMultiThreadFeature(featureObject);
    expect(featureObject).toEqual({
      multithread: {
        init: MediaSourceContentInitializer,
        coreInterface: WorkerCoreInterface,
      },
    });
  });
});
