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
import byteRange from "../utils/byte_range";
import inferSegmentContainer from "../utils/infer_segment_container";
import addSegmentIntegrityChecks from "./add_segment_integrity_checks_to_loader";
import constructSegmentUrl from "./construct_segment_url";
import initSegmentLoader from "./init_segment_loader";
import lowLatencySegmentLoader from "./low_latency_segment_loader";
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
    function textTrackLoader(wantedCdn, context, options, cancelSignal, callbacks) {
        const { segment } = context;
        const { range } = segment;
        const url = constructSegmentUrl(wantedCdn, segment);
        if (url === null) {
            return Promise.resolve({
                resultType: "segment-created",
                resultData: null,
            });
        }
        if (segment.isInit) {
            return initSegmentLoader(url, segment, options, cancelSignal, callbacks);
        }
        const containerType = inferSegmentContainer(context.type, context.mimeType);
        const seemsToBeMP4 = containerType === "mp4" || containerType === undefined;
        if (lowLatencyMode && seemsToBeMP4) {
            if (fetchIsSupported()) {
                return lowLatencySegmentLoader(url, context, options, callbacks, cancelSignal);
            }
            else {
                warnOnce("DASH: Your browser does not have the fetch API. You will have " +
                    "a higher chance of rebuffering when playing close to the live edge");
            }
        }
        if (seemsToBeMP4) {
            return request({
                url,
                responseType: "arraybuffer",
                headers: Array.isArray(range) ? { Range: byteRange(range) } : null,
                timeout: options.timeout,
                connectionTimeout: options.connectionTimeout,
                onProgress: callbacks.onProgress,
                cancelSignal,
            }).then((data) => ({ resultType: "segment-loaded", resultData: data }));
        }
        return request({
            url,
            responseType: "text",
            headers: Array.isArray(range) ? { Range: byteRange(range) } : null,
            timeout: options.timeout,
            connectionTimeout: options.connectionTimeout,
            onProgress: callbacks.onProgress,
            cancelSignal,
        }).then((data) => ({ resultType: "segment-loaded", resultData: data }));
    }
}
