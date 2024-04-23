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
import type { ICustomMediaKeySystemAccess } from "../../compat/eme";
import type { IKeySystemOption } from "../../public_types";
import type { CancellationSignal } from "../../utils/task_canceller";
export interface IMediaKeySystemAccessInfos {
    mediaKeySystemAccess: MediaKeySystemAccess | ICustomMediaKeySystemAccess;
    options: IKeySystemOption;
}
export interface IReuseMediaKeySystemAccessEvent {
    type: "reuse-media-key-system-access";
    value: IMediaKeySystemAccessInfos;
}
export interface ICreateMediaKeySystemAccessEvent {
    type: "create-media-key-system-access";
    value: IMediaKeySystemAccessInfos;
}
export type IFoundMediaKeySystemAccessEvent = IReuseMediaKeySystemAccessEvent | ICreateMediaKeySystemAccessEvent;
/**
 * Try to find a compatible key system from the keySystems array given.
 *
 * This function will request a MediaKeySystemAccess based on the various
 * keySystems provided.
 *
 * This Promise might either:
 *   - resolves the MediaKeySystemAccess and the keySystems as an object, when
 *     found.
 *   - reject if no compatible key system has been found.
 *
 * @param {HTMLMediaElement} mediaElement
 * @param {Array.<Object>} keySystemsConfigs - The keySystems you want to test.
 * @param {Object} cancelSignal
 * @returns {Promise.<Object>}
 */
export default function getMediaKeySystemAccess(mediaElement: HTMLMediaElement, keySystemsConfigs: IKeySystemOption[], cancelSignal: CancellationSignal): Promise<IFoundMediaKeySystemAccessEvent>;
