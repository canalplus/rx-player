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

import addClassName from "./add_class_name";
import addTextTrack from "./add_text_track";
import {
  ICompatTextTrack,
  ICompatVTTCue,
  MediaSource_,
} from "./browser_compatibility_types";
import canPatchISOBMFFSegment from "./can_patch_isobmff";
import canReuseMediaKeys from "./can_reuse_media_keys";
import tryToChangeSourceBufferType, {
  ICompatSourceBuffer,
} from "./change_source_buffer_type";
import clearElementSrc from "./clear_element_src";
import enableAudioTrack from "./enable_audio_track";
import * as events from "./event_listeners";
import getStartDate from "./get_start_date";
import isCodecSupported from "./is_codec_supported";
import isVTTCue from "./is_vtt_cue";
import makeVTTCue from "./make_vtt_cue";
import onHeightWidthChange from "./on_height_width_change";
import patchWebkitSourceBuffer from "./patch_webkit_source_buffer";
import shouldReloadMediaSourceOnDecipherabilityUpdate from "./should_reload_media_source_on_decipherability_update";
import shouldRenewMediaKeySystemAccess from "./should_renew_media_key_system_access";
import shouldUnsetMediaKeys from "./should_unset_media_keys";
import shouldValidateMetadata from "./should_validate_metadata";
import shouldWaitForDataBeforeLoaded from "./should_wait_for_data_before_loaded";
import shouldWaitForHaveEnoughData from "./should_wait_for_have_enough_data";

// TODO To remove. This seems to be the only side-effect done on import, which
// we  would prefer to disallow (both for the understandability of the code and
// to better exploit tree shaking.
patchWebkitSourceBuffer();

export {
  addClassName,
  addTextTrack,
  canPatchISOBMFFSegment,
  canReuseMediaKeys,
  clearElementSrc,
  enableAudioTrack,
  events,
  getStartDate,
  ICompatTextTrack,
  ICompatVTTCue,
  ICompatSourceBuffer,
  isCodecSupported,
  isVTTCue,
  makeVTTCue,
  MediaSource_,
  onHeightWidthChange,
  shouldReloadMediaSourceOnDecipherabilityUpdate,
  shouldRenewMediaKeySystemAccess,
  shouldUnsetMediaKeys,
  shouldValidateMetadata,
  shouldWaitForDataBeforeLoaded,
  shouldWaitForHaveEnoughData,
  tryToChangeSourceBufferType,
};
