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
var bif_1 = require("../../parsers/images/bif");
/**
 * Parse thumbnails in the "BIF" format into a more exploitable form.
 * @param {ArrayBuffer} buf - The BIF file
 * @returns {Object}
 */
function parseBifThumbnails(buf) {
    var parsed = (0, bif_1.default)(new Uint8Array(buf));
    return {
        version: parsed.version,
        images: parsed.thumbs.map(function (t) {
            return { startTime: t.ts, image: t.data.buffer };
        }),
    };
}
exports.default = parseBifThumbnails;
