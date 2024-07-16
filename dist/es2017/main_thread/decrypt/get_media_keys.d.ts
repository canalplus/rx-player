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
import type { ICustomMediaKeys, ICustomMediaKeySystemAccess } from "../../compat/eme";
import type { IKeySystemOption } from "../../public_types";
import type { CancellationSignal } from "../../utils/task_canceller";
import type { IMediaKeySessionStores } from "./types";
/** Object returned by `getMediaKeysInfos`. */
export interface IMediaKeysInfos {
    /** The MediaKeySystemAccess which allowed to create the MediaKeys instance. */
    mediaKeySystemAccess: MediaKeySystemAccess | ICustomMediaKeySystemAccess;
    /** The MediaKeys instance. */
    mediaKeys: MediaKeys | ICustomMediaKeys;
    /** Stores allowing to create and retrieve MediaKeySessions. */
    stores: IMediaKeySessionStores;
    /** IKeySystemOption compatible to the created MediaKeys instance. */
    options: IKeySystemOption;
}
/**
 * Create a MediaKeys instance and associated structures (or just return the
 * current ones if sufficient) based on a wanted configuration.
 * @param {HTMLMediaElement} mediaElement - The HTMLMediaElement on which you
 * will attach the MediaKeys instance.
 * This Element is here only used to check if the current MediaKeys and
 * MediaKeySystemAccess instances are sufficient
 * @param {Array.<Object>} keySystemsConfigs - The key system configuration.
 * Needed to ask the right MediaKeySystemAccess.
 * @param {Object} cancelSignal - CancellationSignal allowing to cancel the
 * creation of the MediaKeys instance while the task is still pending.
 * @returns {Promise.<Object>}
 */
export default function getMediaKeysInfos(mediaElement: HTMLMediaElement, keySystemsConfigs: IKeySystemOption[], cancelSignal: CancellationSignal): Promise<IMediaKeysInfos>;
//# sourceMappingURL=get_media_keys.d.ts.map