import { describe, it, expect, vi } from "vitest";
import addMultiThreadFeature from "../../../../../src/experimental/features/multi_thread.ts";
import type { IFeaturesObject } from "../../../../../src/features/types.ts";
import { WorkerCoreInterface } from "../../../../../src/main_thread/core_interface/multithread.ts";
import MediaSourceContentInitializer from "../../../../../src/main_thread/init/media_source_content_initializer.ts";

describe("Experimental features - MULTI_THREAD compatibility alias", () => {
  it("should warn and add the multi-thread implementation", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const featureObject: IFeaturesObject = {} as IFeaturesObject;
    addMultiThreadFeature(featureObject);
    expect(warnSpy).toHaveBeenCalledOnce();
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
