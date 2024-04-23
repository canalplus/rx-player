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
 * Extract the webm HDR information out of the codec string.
 * The syntax of the codec string is defined in VP Codec ISO Media File Format
 * Binding, in the section Codecs Parameter String.
 * @param {string} codecString
 * @returns {Object | undefined}
 */
export function getWEBMHDRInformation(codecString) {
    // cccc.PP.LL.DD.CC[.cp[.tc[.mc[.FF]]]]
    const [cccc, _PP, _LL, DD, _CC, cp, tc, mc] = codecString.split(".");
    if (cccc !== "vp08" && cccc !== "vp09" && cccc !== "vp10") {
        return undefined;
    }
    let colorDepth;
    let eotf;
    let colorSpace;
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
    return { colorDepth, eotf, colorSpace };
}
