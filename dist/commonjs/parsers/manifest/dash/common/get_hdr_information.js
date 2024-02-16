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
var __read = (this && this.__read) || function (o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o), r, ar = [], e;
    try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    }
    catch (error) { e = { error: error }; }
    finally {
        try {
            if (r && !r.done && (m = i["return"])) m.call(i);
        }
        finally { if (e) throw e.error; }
    }
    return ar;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getWEBMHDRInformation = void 0;
/**
 * Extract the webm HDR information out of the codec string.
 * The syntax of the codec string is defined in VP Codec ISO Media File Format
 * Binding, in the section Codecs Parameter String.
 * @param {string} codecString
 * @returns {Object | undefined}
 */
function getWEBMHDRInformation(codecString) {
    // cccc.PP.LL.DD.CC[.cp[.tc[.mc[.FF]]]]
    var _a = __read(codecString.split("."), 8), cccc = _a[0], _PP = _a[1], _LL = _a[2], DD = _a[3], _CC = _a[4], cp = _a[5], tc = _a[6], mc = _a[7];
    if (cccc !== "vp08" && cccc !== "vp09" && cccc !== "vp10") {
        return undefined;
    }
    var colorDepth;
    var eotf;
    var colorSpace;
    if ((DD !== undefined && DD === "10") || DD === "12") {
        colorDepth = parseInt(DD, 10);
    }
    if (tc !== undefined) {
        if (tc === "16") {
            eotf = "pq";
        }
        else if (tc === "18") {
            eotf = "hlg";
        }
    }
    if (cp !== undefined && mc !== undefined && cp === "09" && mc === "09") {
        colorSpace = "rec2020";
    }
    if (colorDepth === undefined || eotf === undefined) {
        return undefined;
    }
    return { colorDepth: colorDepth, eotf: eotf, colorSpace: colorSpace };
}
exports.getWEBMHDRInformation = getWEBMHDRInformation;
