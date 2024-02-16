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

import MediaSourceContentInitializer from "../../../main_thread/init/media_source_content_initializer";
import mainCodecSupportProber from "../../../mse/main_codec_support_prober";
import dashFastJsParser from "../../../parsers/manifest/dash/fast-js-parser";
import DASHFeature from "../../../transports/dash";
import type { IFeaturesObject } from "../../types";
import addDASHJsFeature from "../dash_js";

describe("Features list - DASH", () => {
  it("should add DASH in the current features", () => {
    const featureObject = {
      transports: {},
      dashParsers: { native: null, fastJs: null, wasm: null },
      mainThreadMediaSourceInit: null,
    } as unknown as IFeaturesObject;
    addDASHJsFeature(featureObject);
    expect(featureObject).toEqual({
      transports: { dash: DASHFeature },
      dashParsers: { fastJs: dashFastJsParser, native: null, wasm: null },
      mainThreadMediaSourceInit: MediaSourceContentInitializer,
      codecSupportProber: mainCodecSupportProber,
    });
    expect(featureObject.transports.dash).toBe(DASHFeature);
    expect(featureObject.mainThreadMediaSourceInit).toBe(MediaSourceContentInitializer);
    expect(featureObject.codecSupportProber).toBe(mainCodecSupportProber);
  });
});
