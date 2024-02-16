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
import { isWebOs } from "../../compat/browser_detection";
import log from "../../log";
import noop from "../../utils/noop";
import { disableMediaKeys } from "./attach_media_keys";
import getMediaKeysInfos from "./get_media_keys";
/**
 * Get media keys infos from key system configs then attach media keys to media element.
 * @param {HTMLMediaElement} mediaElement
 * @param {Array.<Object>} keySystemsConfigs
 * @param {Object} cancelSignal
 * @returns {Promise.<Object>}
 */
export default async function initMediaKeys(mediaElement, keySystemsConfigs, cancelSignal) {
    const mediaKeysInfo = await getMediaKeysInfos(mediaElement, keySystemsConfigs, cancelSignal);
    const { mediaKeys } = mediaKeysInfo;
    const shouldDisableOldMediaKeys = mediaElement.mediaKeys !== null &&
        mediaElement.mediaKeys !== undefined &&
        mediaKeys !== mediaElement.mediaKeys;
    if (shouldDisableOldMediaKeys) {
        log.debug("DRM: Disabling old MediaKeys");
        // TODO should we be awaiting always?
        // Should be tested on all devices, we may want to wait for another
        // version to make this important change.
        if (isWebOs) {
            await disableMediaKeys(mediaElement);
        }
        else {
            disableMediaKeys(mediaElement).catch(noop);
        }
    }
    return mediaKeysInfo;
}
