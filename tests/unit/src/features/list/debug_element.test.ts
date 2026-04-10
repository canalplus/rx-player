import { describe, it, expect } from "vitest";
import addDebugElementFeature from "../../../../../src/features/list/debug_element.ts";
import type { IFeaturesObject } from "../../../../../src/features/types.ts";
import createDebugElement from "../../../../../src/main_thread/api/debug/index.ts";

describe("Features list - DEBUG_ELEMENT", () => {
  it("should add DEBUG_ELEMENT in the current features", () => {
    const featureObject = {} as unknown as IFeaturesObject;
    addDebugElementFeature(featureObject);
    expect(featureObject).toEqual({ createDebugElement });
    expect(featureObject.createDebugElement).toBe(createDebugElement);
  });
});
