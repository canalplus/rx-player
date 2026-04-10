import { describe, it, expect } from "vitest";
import addEMEFeature from "../../../../../src/features/list/eme.ts";
import type { IFeaturesObject } from "../../../../../src/features/types.ts";
import ContentDecryptor from "../../../../../src/main_thread/decrypt/index.ts";

describe("Features list - EME", () => {
  it("should add the ContentDecryptor in the current features", () => {
    const featureObject = {} as unknown as IFeaturesObject;
    addEMEFeature(featureObject);
    expect(featureObject).toEqual({ decrypt: ContentDecryptor });
    expect(featureObject.decrypt).toBe(ContentDecryptor);
  });
});
