import createDebugElement from "../../../core/api/debug";
import type { IFeaturesObject } from "../../../features/types";
import addDebugElementFeature from "../debug_element";

describe("Features list - DEBUG_ELEMENT", () => {
  it("should add DEBUG_ELEMENT in the current features", () => {
    const featureObject = {} as unknown as IFeaturesObject;
    addDebugElementFeature(featureObject);
    expect(featureObject).toEqual({ createDebugElement });
    expect(featureObject.createDebugElement).toBe(createDebugElement);
  });
});
