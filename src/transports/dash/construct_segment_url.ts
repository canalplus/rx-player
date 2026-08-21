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

import type { ISegment } from "../../manifest/index.ts";
import type { ICdnMetadata, IRequestParameters } from "../../parsers/manifest/index.ts";
import {
  appendURLQueryString,
  areSameOrigin,
  resolveURL,
} from "../../utils/url-utils.ts";

export default function constructSegmentUrl(
  wantedCdn: ICdnMetadata | null,
  segment: ISegment,
  requestParameters?: IRequestParameters | undefined,
): string | null {
  if (wantedCdn === null) {
    return null;
  }
  if (segment.url === null) {
    return appendQueryString(wantedCdn.baseUrl, requestParameters);
  }
  return appendQueryString(resolveURL(wantedCdn.baseUrl, segment.url), requestParameters);
}

/** Append a raw query string while preserving a possible URL fragment. */
function appendQueryString(
  url: string,
  requestParameters: IRequestParameters | undefined,
): string {
  const queryStrings = requestParameters?.urlQuery
    ?.filter(
      (query) =>
        !query.sameOriginOnly ||
        (query.sourceUrl !== undefined && areSameOrigin(query.sourceUrl, url)),
    )
    .map((query) => query.value)
    .filter((query) => query.length > 0);
  if (queryStrings === undefined || queryStrings.length === 0) {
    return url;
  }
  return appendURLQueryString(url, queryStrings.join("&"));
}
