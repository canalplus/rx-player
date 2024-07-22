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
/**
 * Guess the type of container a segment is in based on Manifest information.
 *
 * Returns:
 *   - "mp4" if we can say with confidence the segment will be in an mp4 format
 *   - "webm" if we can say with confidence the segment will be in a webm format
 *   - `undefined` if we cannot say with confidence in which container the
 *     segment will be in.
 * @param {string} adaptationType
 * @param {string} mimeType
 * @returns {string | undefined}
 */
function inferSegmentContainer(adaptationType, mimeType) {
    if (adaptationType === "audio" || adaptationType === "video") {
        if (mimeType === "video/mp4" || mimeType === "audio/mp4") {
            return "mp4";
        }
        if (mimeType === "video/webm" || mimeType === "audio/webm") {
            return "webm";
        }
        return undefined;
    }
    else if (adaptationType === "text") {
        return mimeType === "application/mp4" ? "mp4" : undefined;
    }
    return undefined;
}
exports.default = inferSegmentContainer;
