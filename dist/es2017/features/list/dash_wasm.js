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
import MediaSourceContentInitializer from "../../main_thread/init/media_source_content_initializer";
import mainCodecSupportProber from "../../mse/main_codec_support_prober";
import DashWasmParser from "../../parsers/manifest/dash/wasm-parser";
import dash from "../../transports/dash";
const dashWasmParser = new DashWasmParser();
const dashWasmFeature = {
    _addFeature(features) {
        if (features.transports.dash === undefined) {
            features.transports.dash = dash;
        }
        features.dashParsers.wasm = dashWasmParser;
        features.mainThreadMediaSourceInit = MediaSourceContentInitializer;
        features.codecSupportProber = mainCodecSupportProber;
    },
    initialize(opts) {
        return dashWasmParser.initialize(opts);
    },
};
export { dashWasmFeature as DASH_WASM };
export default dashWasmFeature;
