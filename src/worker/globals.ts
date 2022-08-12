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

import createSharedReference from "../common/utils/reference";

/** Buffer "goal" at which we stop downloading new segments. */
const wantedBufferAhead = createSharedReference(30);

/** Buffer maximum size in kiloBytes at which we stop downloading */
const maxVideoBufferSize = createSharedReference(Infinity);

/** Max buffer size after the current position, in seconds (we GC further up). */
const maxBufferAhead = createSharedReference(Infinity);

/** Max buffer size before the current position, in seconds (we GC further down). */
const maxBufferBehind = createSharedReference(Infinity);

const minAudioBitrate = createSharedReference(0);
const minVideoBitrate = createSharedReference(0);
const maxAudioBitrate = createSharedReference(Infinity);
const maxVideoBitrate = createSharedReference(Infinity);
const manualAudioBitrate = createSharedReference(-1);
const manualVideoBitrate = createSharedReference(-1);
const limitVideoWidth = createSharedReference(Infinity);
const throttleVideo = createSharedReference(Infinity);
const throttleVideoBitrate = createSharedReference(Infinity);

/** Emit the playback rate (speed) set by the user. */
const speed = createSharedReference(1);

export {
  wantedBufferAhead,
  maxVideoBufferSize,
  maxBufferBehind,
  maxBufferAhead,
  minAudioBitrate,
  minVideoBitrate,
  maxAudioBitrate,
  maxVideoBitrate,
  manualAudioBitrate,
  manualVideoBitrate,
  limitVideoWidth,
  throttleVideo,
  throttleVideoBitrate,
  speed,
};
