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

import type { ISegment, IRepresentation } from "../../manifest";
import type { ICdnMetadata } from "../../parsers/manifest";
import resolveURL from "../../utils/resolve_url";

/**
 * Returns `true` if the given Representation refers to segments in an MP4
 * container
 * @param {Representation} representation
 * @returns {Boolean}
 */
function isMP4EmbeddedTrack(representation: IRepresentation): boolean {
  return (
    typeof representation.mimeType === "string" &&
    representation.mimeType.indexOf("mp4") >= 0
  );
}

function constructSegmentUrl(
  wantedCdn: ICdnMetadata | null,
  segment: ISegment,
): string | null {
  if (wantedCdn === null) {
    return null;
  }
  if (segment.url === null) {
    return wantedCdn.baseUrl;
  }
  return resolveURL(wantedCdn.baseUrl, segment.url);
}

export { constructSegmentUrl, isMP4EmbeddedTrack };
