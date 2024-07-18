"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
var browser_detection_1 = require("./browser_detection");
/**
 * Add text track to the given media element.
 *
 * Returns an object with the following properties:
 *   - track {TextTrack}: the added text track
 *   - trackElement {HTMLElement|undefined}: the added <track> element.
 *     undefined if no trackElement was added.
 *
 * @param {HTMLMediaElement} mediaElement
 * @returns {Object}
 */
function addTextTrack(mediaElement) {
    var _a;
    var track;
    var trackElement;
    var kind = "subtitles";
    if (browser_detection_1.isIEOrEdge) {
        var tracksLength = mediaElement.textTracks.length;
        track = (tracksLength > 0
            ? mediaElement.textTracks[tracksLength - 1]
            : mediaElement.addTextTrack(kind));
        track.mode = (_a = track.SHOWING) !== null && _a !== void 0 ? _a : "showing";
    }
    else {
        trackElement = document.createElement("track");
        mediaElement.appendChild(trackElement);
        track = trackElement.track;
        trackElement.kind = kind;
        track.mode = "showing";
    }
    return { track: track, trackElement: trackElement };
}
exports.default = addTextTrack;
