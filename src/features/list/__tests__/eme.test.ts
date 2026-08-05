import { describe, it, expect } from "vitest";
import ContentDecryptor from "../../../main_thread/decrypt/index.ts";
import type { IFeaturesObject } from "../../types.ts";
import addEMEFeature from "../eme.ts";

describe("Features list - EME", () => {
  it("should add the ContentDecryptor in the current features", () => {
    const featureObject = {} as unknown as IFeaturesObject;
    addEMEFeature(featureObject);
    expect(featureObject).toEqual({ decrypt: ContentDecryptor });
    expect(featureObject.decrypt).toBe(ContentDecryptor);
  });
});
