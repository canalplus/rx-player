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
import MainMediaSourceInterface from "../../../mse/main_media_source_interface";
import type { CancellationSignal } from "../../../utils/task_canceller";
/**
 * Dispose of ressources taken by the MediaSource:
 *   - Clear the MediaSource' SourceBuffers
 *   - Clear the mediaElement's src (stop the mediaElement)
 *   - Revoke MediaSource' URL
 * @param {HTMLMediaElement} mediaElement
 * @param {string|null} mediaSourceURL
 */
export declare function resetMediaElement(mediaElement: HTMLMediaElement, mediaSourceURL: string | null): void;
/**
 * Create and open a new MediaSource object on the given media element.
 * Resolves with the MediaSource when done.
 *
 * When the given `unlinkSignal` emits, mediaElement.src is cleaned, MediaSource
 * SourceBuffers are aborted and some minor cleaning is done.
 * @param {HTMLMediaElement} mediaElement
 * @param {Object} unlinkSignal
 * @returns {Promise}
 */
export default function openMediaSource(mediaElement: HTMLMediaElement, unlinkSignal: CancellationSignal): Promise<MainMediaSourceInterface>;
