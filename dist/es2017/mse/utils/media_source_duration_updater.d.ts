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
/**
 * Keep the MediaSource's `duration` attribute up-to-date with the duration of
 * the content played on it.
 * @class MediaSourceDurationUpdater
 */
export default class MediaSourceDurationUpdater {
    /**
     * `MediaSource` on which we're going to update the `duration` attribute.
     */
    private _mediaSource;
    /**
     * Abort the current duration-setting logic.
     * `null` if no such logic is pending.
     */
    private _currentMediaSourceDurationUpdateCanceller;
    /**
     * Create a new `MediaSourceDurationUpdater`,
     * @param {MediaSource} mediaSource - The MediaSource on which the content is
     * played.
     */
    constructor(mediaSource: MediaSource);
    /**
     * Indicate to the `MediaSourceDurationUpdater` the currently known duration
     * of the content.
     *
     * The `MediaSourceDurationUpdater` will then use that value to determine
     * which `duration` attribute should be set on the `MediaSource` associated
     *
     * @param {number} newDuration
     * @param {boolean} isRealEndKnown - If set to `false`, the current content is
     * a dynamic content (it might evolve in the future) and the `newDuration`
     * communicated might be greater still. In effect the
     * `MediaSourceDurationUpdater` will actually set a much higher value to the
     * `MediaSource`'s duration to prevent being annoyed by the HTML-related
     * side-effects of having a too low duration (such as the impossibility to
     * seek over that value).
     */
    updateDuration(newDuration: number, isRealEndKnown: boolean): void;
    /**
     * Abort the last duration-setting operation and free its resources.
     */
    stopUpdating(): void;
}
