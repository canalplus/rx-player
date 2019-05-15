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

import { MediaSource_ } from "../../../../compat";

 /**
  * Check if one of given video codecs are supported for decode.
  * These video codecs are chose for their wide proven compatibility and
  * popularity.
  * @returns {string}
  */
export function findDefaultVideoCodec(): string {
  const videoCodecs = [
    "video/mp4;codecs=\"avc1.4d401e\"",
    "video/mp4;codecs=\"avc1.42e01e\"",
    "video/webm;codecs=\"vp8\"",
  ];
  /* tslint:disable no-unbound-method */
  if (MediaSource_ == null || typeof MediaSource_.isTypeSupported !== "function") {
  /* tslint:enable no-unbound-method */
    throw new Error("Cannot check video codec support: No API available.");
  }
  for (const codec of videoCodecs) {
    if (MediaSource_.isTypeSupported(codec)) {
      return codec;
    }
  }
  throw new Error("No default video codec found.");
}

/**
 * Check if one of given audio codecs are supported for decode.
 * These audio codecs are chose for their wide proven compatibility and
 * popularity.
 * @returns {string}
 */
export function findDefaultAudioCodec(): string {
  const audioCodecs = [
    "audio/mp4;codecs=\"mp4a.40.2\"",
    "audio/webm;codecs=opus",
  ];
  /* tslint:disable no-unbound-method */
  if (MediaSource_ == null || typeof MediaSource_.isTypeSupported !== "function") {
  /* tslint:enable no-unbound-method */
    throw new Error("Cannot check audio codec support: No API available.");
  }
  for (const codec of audioCodecs) {
    if (MediaSource_.isTypeSupported(codec)) {
      return codec;
    }
  }
  throw new Error("No default audio codec found.");
}
