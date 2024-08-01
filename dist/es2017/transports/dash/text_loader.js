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
import request, { fetchIsSupported } from "../../utils/request";
import warnOnce from "../../utils/warn_once";
import addQueryString from "../utils/add_query_string";
import byteRange from "../utils/byte_range";
import inferSegmentContainer from "../utils/infer_segment_container";
import constructSegmentUrl from "./construct_segment_url";
import initSegmentLoader from "./init_segment_loader";
import { addSegmentIntegrityChecks } from "./integrity_checks";
import loadChunkedSegmentData from "./load_chunked_segment_data";
/**
 * Perform requests for "text" segments
 * @param {boolean} lowLatencyMode
 * @returns {Function}
 */
export default function generateTextTrackLoader({ lowLatencyMode, checkMediaSegmentIntegrity, }) {
    return checkMediaSegmentIntegrity !== true
        ? textTrackLoader
        : addSegmentIntegrityChecks(textTrackLoader);
    /**
     * @param {Object|null} wantedCdn
     * @param {Object} context
     * @param {Object} options
     * @param {Object} cancelSignal
     * @param {Object} callbacks
     * @returns {Promise}
     */
    async function textTrackLoader(wantedCdn, context, options, cancelSignal, callbacks) {
        var _a, _b;
        const { segment } = context;
        const initialUrl = constructSegmentUrl(wantedCdn, segment);
        if (initialUrl === null) {
            return Promise.resolve({
                resultType: "segment-created",
                resultData: null,
            });
        }
        if (segment.isInit) {
            return initSegmentLoader(initialUrl, segment, options, cancelSignal, callbacks);
        }
        const url = ((_a = options.cmcdPayload) === null || _a === void 0 ? void 0 : _a.type) === "query"
            ? addQueryString(initialUrl, options.cmcdPayload.value)
            : initialUrl;
        const cmcdHeaders = ((_b = options.cmcdPayload) === null || _b === void 0 ? void 0 : _b.type) === "headers" ? options.cmcdPayload.value : undefined;
        let headers;
        if (segment.range !== undefined) {
            headers = Object.assign(Object.assign({}, cmcdHeaders), { Range: byteRange(segment.range) });
        }
        else if (cmcdHeaders !== undefined) {
            headers = cmcdHeaders;
        }
        const containerType = inferSegmentContainer(context.type, context.mimeType);
        const seemsToBeMP4 = containerType === "mp4" || containerType === undefined;
        if (lowLatencyMode && seemsToBeMP4) {
            if (fetchIsSupported()) {
                return loadChunkedSegmentData(url, {
                    headers,
                    timeout: options.timeout,
                    connectionTimeout: options.connectionTimeout,
                }, callbacks, cancelSignal);
            }
            else {
                warnOnce("DASH: Your browser does not have the fetch API. You will have " +
                    "a higher chance of rebuffering when playing close to the live edge");
            }
        }
        let data;
        if (seemsToBeMP4) {
            data = await request({
                url,
                responseType: "arraybuffer",
                headers,
                timeout: options.timeout,
                connectionTimeout: options.connectionTimeout,
                onProgress: callbacks.onProgress,
                cancelSignal,
            });
        }
        else {
            data = await request({
                url,
                responseType: "text",
                headers,
                timeout: options.timeout,
                connectionTimeout: options.connectionTimeout,
                onProgress: callbacks.onProgress,
                cancelSignal,
            });
        }
        return { resultType: "segment-loaded", resultData: data };
    }
}
