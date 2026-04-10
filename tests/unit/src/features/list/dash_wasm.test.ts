import { describe, it, expect, vi } from "vitest";
import dashWasmFeature from "../../../../../src/features/list/dash_wasm.ts";
import type { IFeaturesObject } from "../../../../../src/features/types.ts";
import DashWasmParser from "../../../../../src/parsers/manifest/dash/wasm-parser/index.ts";
import DASHFeature from "../../../../../src/transports/dash/index.ts";

describe("Features list - DASH WASM Parser", () => {
  it("should add DASH WASM parser in the current features", () => {
    const mockInitialize = vi
      .spyOn(DashWasmParser.prototype, "initialize")
      .mockImplementation(vi.fn(() => Promise.resolve()));

    const DASH_WASM = dashWasmFeature;
    expect(mockInitialize).not.toHaveBeenCalled();

    DASH_WASM.initialize({ wasmUrl: "blank" }).catch(() => {
      /* noop */
    });

    expect(mockInitialize).toHaveBeenCalledTimes(1);

    const featureObject = {
      transports: {},
      dashParsers: { js: null, wasm: null },
    } as unknown as IFeaturesObject;
    DASH_WASM._addFeature(featureObject);
    expect(featureObject.transports).toEqual({ dash: DASHFeature });
    expect(featureObject.dashParsers.js).toEqual(null);
    expect(featureObject.dashParsers.wasm).toBeInstanceOf(DashWasmParser);
  });
});
