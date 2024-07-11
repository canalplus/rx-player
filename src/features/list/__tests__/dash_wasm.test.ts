import { describe, it, expect, vi } from "vitest";
import type { IFeaturesObject } from "../../../features/types";
import DashWasmParser from "../../../parsers/manifest/dash/wasm-parser";
import DASHFeature from "../../../transports/dash";
import dashWasmFeature from "../dash_wasm";

describe("Features list - DASH WASM Parser", () => {
  it("should add DASH WASM parser in the current features", () => {
    const mockInitialize = vi
      .spyOn(DashWasmParser.prototype, "initialize")
      .mockImplementation(vi.fn());

    const DASH_WASM = dashWasmFeature;
    expect(mockInitialize).not.toHaveBeenCalled();

    /* eslint-disable @typescript-eslint/no-floating-promises */
    DASH_WASM.initialize({ wasmUrl: "blank" });
    /* eslint-enable @typescript-eslint/no-floating-promises */

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
