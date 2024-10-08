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

import { MediaSource_ } from "../../../../compat/browser_compatibility_types";
import isNullOrUndefined from "../../../../utils/is_null_or_undefined";
import type { IMediaConfiguration } from "../types";

/**
 * @param {Object} config
 * @returns {Promise}
 */
export default function probeContentType(
  config: IMediaConfiguration,
): "NotSupported" | "Supported" {
  if (isNullOrUndefined(MediaSource_)) {
    throw new Error("MediaSource API not available");
  }
  if (typeof MediaSource_.isTypeSupported !== "function") {
    throw new Error("MediaSource.isTypeSupported API not available");
  }
  const contentTypes: string[] = [];
  if (
    config.video !== undefined &&
    config.video.contentType !== undefined &&
    config.video.contentType.length > 0
  ) {
    contentTypes.push(config.video.contentType);
  }
  if (
    config.audio !== undefined &&
    config.audio.contentType !== undefined &&
    config.audio.contentType.length > 0
  ) {
    contentTypes.push(config.audio.contentType);
  }
  if (contentTypes.length === 0) {
    throw new Error("Not enough arguments for calling isTypeSupported.");
  }
  for (let i = 0; i < contentTypes.length; i++) {
    if (!MediaSource_.isTypeSupported(contentTypes[i])) {
      return "NotSupported";
    }
  }
  return "Supported";
}
