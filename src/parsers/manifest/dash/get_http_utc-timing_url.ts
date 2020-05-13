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

import { IMPDIntermediateRepresentation } from "./node_parsers/MPD";

/**
 * @param {Object} mpdIR
 * @returns {string|undefined}
 */
export default function getHTTPUTCTimingURL(
  mpdIR : IMPDIntermediateRepresentation
) : string|undefined {
  const UTCTimingHTTP = mpdIR.children.utcTimings
    .filter((utcTiming) : utcTiming is {
      schemeIdUri : "urn:mpeg:dash:utc:http-iso:2014";
      value : string;
    } =>
      utcTiming.schemeIdUri === "urn:mpeg:dash:utc:http-iso:2014" &&
      utcTiming.value !== undefined
    );

  return UTCTimingHTTP.length > 0 ? UTCTimingHTTP[0].value :
                                    undefined;
}
