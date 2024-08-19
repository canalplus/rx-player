import { describe, it, expect } from "vitest";
import type { IFeaturesObject } from "../../../features/types";
import MultiThreadContentInitializer from "../../../main_thread/init/multi_thread_content_initializer";
import addMultiThreadFeature from "../multi_thread";

describe("Features list - EME", () => {
  it("should add the ContentDecryptor in the current features", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const featureObject: IFeaturesObject = {} as IFeaturesObject;
    addMultiThreadFeature(featureObject);
    expect(featureObject).toEqual({
      multithread: { init: MultiThreadContentInitializer },
    });
    expect(featureObject.multithread).not.toBe(null);
    expect(featureObject.multithread).not.toBe(undefined);
    expect(featureObject.multithread?.init).toBe(MultiThreadContentInitializer);
  });
});
