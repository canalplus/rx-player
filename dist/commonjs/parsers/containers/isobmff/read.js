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
exports.getEMSG = exports.getMDIA = exports.getMDAT = exports.getTRAFs = exports.getTRAF = void 0;
var get_box_1 = require("./get_box");
/**
 * Returns the content of the first "traf" box encountered in the given ISOBMFF
 * data.
 * Returns null if not found.
 * @param {Uint8Array} buffer
 * @returns {Uint8Array|null}
 */
function getTRAF(buffer) {
    var moof = (0, get_box_1.getBoxContent)(buffer, 0x6d6f6f66 /* moof */);
    if (moof === null) {
        return null;
    }
    return (0, get_box_1.getBoxContent)(moof, 0x74726166 /* traf */);
}
exports.getTRAF = getTRAF;
/**
 * Returns the content of all "traf" boxes encountered in the given ISOBMFF
 * data.
 * Might be preferred to just `getTRAF` if you suspect that your ISOBMFF may
 * have multiple "moof" boxes.
 * @param {Uint8Array} buffer
 * @returns {Array.<Uint8Array>}
 */
function getTRAFs(buffer) {
    var moofs = (0, get_box_1.getBoxesContent)(buffer, 0x6d6f6f66 /* moof */);
    return moofs.reduce(function (acc, moof) {
        var traf = (0, get_box_1.getBoxContent)(moof, 0x74726166 /* traf */);
        if (traf !== null) {
            acc.push(traf);
        }
        return acc;
    }, []);
}
exports.getTRAFs = getTRAFs;
/**
 * Returns the content of the first "moof" box encountered in the given ISOBMFF
 * data.
 * Returns null if not found.
 * @param {Uint8Array} buffer
 * @returns {Uint8Array|null}
 */
function getMDAT(buf) {
    return (0, get_box_1.getBoxContent)(buf, 0x6d646174 /* "mdat" */);
}
exports.getMDAT = getMDAT;
/**
 * Returns the content of the first "mdia" box encountered in the given ISOBMFF
 * data.
 * Returns null if not found.
 * @param {Uint8Array} buffer
 * @returns {Uint8Array|null}
 */
function getMDIA(buf) {
    var moov = (0, get_box_1.getBoxContent)(buf, 0x6d6f6f76 /* moov */);
    if (moov === null) {
        return null;
    }
    var trak = (0, get_box_1.getBoxContent)(moov, 0x7472616b /* "trak" */);
    if (trak === null) {
        return null;
    }
    return (0, get_box_1.getBoxContent)(trak, 0x6d646961 /* "mdia" */);
}
exports.getMDIA = getMDIA;
/**
 * Returns the content of the first "emsg" box encountered in the given ISOBMFF
 * data.
 * Returns null if not found.
 * @param {Uint8Array} buffer
 * @returns {Uint8Array|null}
 */
function getEMSG(buffer, offset) {
    if (offset === void 0) { offset = 0; }
    return (0, get_box_1.getBoxContent)(buffer.subarray(offset), 0x656d7367 /* emsg */);
}
exports.getEMSG = getEMSG;
