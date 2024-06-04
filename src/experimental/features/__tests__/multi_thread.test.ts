import { describe, it, expect } from "vitest";
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */

import MultiThreadContentInitializer from "../../../main_thread/init/multi_thread_content_initializer";
import addMultiThreadFeature from "../multi_thread";

describe("Features list - EME", () => {
  it("should add the ContentDecryptor in the current features", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const featureObject: any = {};
    addMultiThreadFeature(featureObject);
    expect(featureObject).toEqual({
      multithread: { init: MultiThreadContentInitializer },
    });
    expect(featureObject.multithread.init).toBe(MultiThreadContentInitializer);
  });
});
