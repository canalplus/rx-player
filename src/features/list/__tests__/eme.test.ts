import { describe, it, expect } from "vitest";
import ContentDecryptor from "../../../main_thread/decrypt";
import type { IFeaturesObject } from "../../types";
import addEMEFeature from "../eme";

describe("Features list - EME", () => {
  it("should add the ContentDecryptor in the current features", () => {
    const featureObject = {} as unknown as IFeaturesObject;
    addEMEFeature(featureObject);
    expect(featureObject).toEqual({ decrypt: ContentDecryptor });
    expect(featureObject.decrypt).toBe(ContentDecryptor);
  });
});
