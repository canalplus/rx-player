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
exports.isMP4EmbeddedTrack = exports.constructSegmentUrl = void 0;
var resolve_url_1 = require("../../utils/resolve_url");
/**
 * Returns `true` if the given Representation refers to segments in an MP4
 * container
 * @param {Representation} representation
 * @returns {Boolean}
 */
function isMP4EmbeddedTrack(representation) {
    return (typeof representation.mimeType === "string" &&
        representation.mimeType.indexOf("mp4") >= 0);
}
exports.isMP4EmbeddedTrack = isMP4EmbeddedTrack;
function constructSegmentUrl(wantedCdn, segment) {
    if (wantedCdn === null) {
        return null;
    }
    if (segment.url === null) {
        return wantedCdn.baseUrl;
    }
    return (0, resolve_url_1.default)(wantedCdn.baseUrl, segment.url);
}
exports.constructSegmentUrl = constructSegmentUrl;
