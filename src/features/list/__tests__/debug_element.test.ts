import { describe, it, expect } from "vitest";
import type { IFeaturesObject } from "../../../features/types.ts";
import createDebugElement from "../../../main_thread/api/debug/index.ts";
import addDebugElementFeature from "../debug_element.ts";

describe("Features list - DEBUG_ELEMENT", () => {
  it("should add DEBUG_ELEMENT in the current features", () => {
    const featureObject = {} as unknown as IFeaturesObject;
    addDebugElementFeature(featureObject);
    expect(featureObject).toEqual({ createDebugElement });
    expect(featureObject.createDebugElement).toBe(createDebugElement);
  });
});
