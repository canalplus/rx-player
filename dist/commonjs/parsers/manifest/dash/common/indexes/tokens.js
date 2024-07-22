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
exports.createDashUrlDetokenizer = exports.replaceRepresentationDASHTokens = exports.constructRepresentationUrl = void 0;
var is_non_empty_string_1 = require("../../../../../utils/is_non_empty_string");
/**
 * Pad with 0 in the left of the given n argument to reach l length
 * @param {Number|string} n
 * @param {Number} l
 * @returns {string}
 */
function padLeftWithZeros(n, l) {
    var nToString = n.toString();
    if (nToString.length >= l) {
        return nToString;
    }
    var arr = new Array(l + 1).join("0") + nToString;
    return arr.slice(-l);
}
/**
 * @param {string|number} replacer
 * @returns {Function}
 */
function processFormatedToken(replacer) {
    return function (_match, _format, widthStr) {
        var width = (0, is_non_empty_string_1.default)(widthStr) ? parseInt(widthStr, 10) : 1;
        return padLeftWithZeros(String(replacer), width);
    };
}
/**
 * @param {string} urlTemplate
 * @param {string|undefined} representationId
 * @param {number|undefined} bitrate
 * @returns {string}
 */
function constructRepresentationUrl(urlTemplate, representationId, bitrate) {
    return replaceRepresentationDASHTokens(urlTemplate, representationId, bitrate);
}
exports.constructRepresentationUrl = constructRepresentationUrl;
/**
 * Replace "tokens" written in a given path (e.g. $RepresentationID$) by the corresponding
 * infos, taken from the given segment.
 * @param {string} path
 * @param {string|undefined} id
 * @param {number|undefined} bitrate
 * @returns {string}
 */
function replaceRepresentationDASHTokens(path, id, bitrate) {
    if (path.indexOf("$") === -1) {
        return path;
    }
    else {
        return path
            .replace(/\$\$/g, "$")
            .replace(/\$RepresentationID\$/g, String(id))
            .replace(/\$Bandwidth(\%0(\d+)d)?\$/g, processFormatedToken(bitrate === undefined ? 0 : bitrate));
    }
}
exports.replaceRepresentationDASHTokens = replaceRepresentationDASHTokens;
/**
 * Create function allowing to replace "tokens" in a given DASH segment URL
 * (e.g. $Time$, which has to be replaced by the segment's start time) by the
 * right information.
 * @param {number|undefined} time
 * @param {number|undefined} nb
 * @returns {Function}
 */
function createDashUrlDetokenizer(time, nb) {
    /**
     * Replace the tokens in the given `url` by the segment information defined
     * by the outer function.
     * @param {string} url
     * @returns {string}
     *
     * @throws Error - Throws if we do not have enough data to construct the URL
     */
    return function replaceTokensInUrl(url) {
        if (url.indexOf("$") === -1) {
            return url;
        }
        else {
            return url
                .replace(/\$\$/g, "$")
                .replace(/\$Number(\%0(\d+)d)?\$/g, function (_x, _y, widthStr) {
                if (nb === undefined) {
                    throw new Error("Segment number not defined in a $Number$ scheme");
                }
                return processFormatedToken(nb)(_x, _y, widthStr);
            })
                .replace(/\$Time(\%0(\d+)d)?\$/g, function (_x, _y, widthStr) {
                if (time === undefined) {
                    throw new Error("Segment time not defined in a $Time$ scheme");
                }
                return processFormatedToken(time)(_x, _y, widthStr);
            });
        }
    };
}
exports.createDashUrlDetokenizer = createDashUrlDetokenizer;
