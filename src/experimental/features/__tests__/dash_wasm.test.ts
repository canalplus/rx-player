/**
 * Copyright 2015 CANAL+ Group
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import type { IFeaturesObject } from "../../../features/types";
import DashWasmParser from "../../../parsers/manifest/dash/wasm-parser";
import DASHFeature from "../../../transports/dash";
import dashWasmFeature from "../dash_wasm";

describe("Features list - DASH WASM Parser", () => {
  it("should add DASH WASM parser in the current features", () => {
    const mockInitialize = jest
      .spyOn(DashWasmParser.prototype, "initialize")
      .mockImplementation(jest.fn());

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
