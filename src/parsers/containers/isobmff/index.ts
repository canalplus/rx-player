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

import extractCompleteChunks, { extractInitSegment } from "./extract_complete_chunks.ts";
import extractPssh, { getPsshSystemID } from "./extract_pssh.ts";
import findCompleteBox from "./find_complete_box.ts";
import removeDolbyVisionConfigData from "./remove_dolby_vision_config_data.ts";

export { extractInitSegment };
export { createBox, createBoxWithChildren } from "./create_box.ts";
export {
  getBox,
  getBoxContent,
  getNextBoxOffsets,
  getBoxOffsets,
  getUuidContent,
} from "./get_box.ts";
export { getMDAT, getMDIA, getTRAF } from "./read.ts";
export type { IEMSG, ISidxSegment } from "./utils.ts";
export {
  getMDHDTimescale,
  getPlayReadyKIDFromPrivateData,
  getTrackFragmentDecodeTime,
  getDurationFromTrun,
  getSegmentsFromSidx,
  patchPssh,
  updateBoxLength,
} from "./utils.ts";
export {
  extractCompleteChunks,
  findCompleteBox,
  getPsshSystemID,
  removeDolbyVisionConfigData,
  extractPssh,
};
