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
import {
  replaceURLHost,
  resolveURL,
  setURLQueryParameters,
} from "../../utils/url-utils.ts";
import type { IRequestCdnMetadata } from "../types.ts";

export default function constructSegmentUrl(
  wantedCdn: IRequestCdnMetadata | null,
  segment: ISegment,
): string | null {
  if (wantedCdn === null) {
    return null;
  }
  if (segment.url === null) {
    return applyPathwayClone(wantedCdn.baseUrl, wantedCdn.pathwayClone);
  }
  return applyPathwayClone(
    resolveURL(wantedCdn.baseUrl, segment.url),
    wantedCdn.pathwayClone,
  );
}

function applyPathwayClone(
  url: string,
  replacement: IRequestCdnMetadata["pathwayClone"],
): string {
  if (replacement === undefined) {
    return url;
  }
  let clonedUrl = url;
  if (replacement.host !== undefined) {
    clonedUrl = replaceURLHost(clonedUrl, replacement.host);
  }
  if (replacement.params !== undefined) {
    const parameters = Object.entries(replacement.params).map(
      ([key, value]): [string, string] => [
        decodeUriComponent(key),
        decodeUriComponent(value),
      ],
    );
    clonedUrl = setURLQueryParameters(clonedUrl, parameters);
  }
  return clonedUrl;
}

function decodeUriComponent(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch (_) {
    return value;
  }
}
