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
// Store the MediaKeys infos attached to a media element.
const currentMediaState = new WeakMap();
export default {
    /**
     * Update MediaKeys infos set on a HMTLMediaElement
     * @param {HTMLMediaElement} mediaElement
     * @param {Object} state
     */
    setState(mediaElement, state) {
        currentMediaState.set(mediaElement, state);
    },
    /**
     * Get MediaKeys infos currently set on a HMTLMediaElement
     * @param {HTMLMediaElement} mediaElement
     * @returns {Object}
     */
    getState(mediaElement) {
        const currentState = currentMediaState.get(mediaElement);
        return currentState === undefined ? null : currentState;
    },
    /**
     * Remove MediaKeys infos currently set on a HMTLMediaElement
     * @param {HTMLMediaElement} mediaElement
     */
    clearState(mediaElement) {
        currentMediaState.set(mediaElement, null);
    },
};
