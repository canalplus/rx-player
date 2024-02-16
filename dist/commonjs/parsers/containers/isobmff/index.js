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
exports.takePSSHOut = exports.getPsshSystemID = exports.updateBoxLength = exports.patchPssh = exports.getSegmentsFromSidx = exports.getDurationFromTrun = exports.getTrackFragmentDecodeTime = exports.getPlayReadyKIDFromPrivateData = exports.getMDHDTimescale = exports.getTRAF = exports.getMDIA = exports.getMDAT = exports.getUuidContent = exports.getBoxOffsets = exports.getNextBoxOffsets = exports.getBoxContent = exports.getBox = exports.createBoxWithChildren = exports.createBox = void 0;
var take_pssh_out_1 = require("./take_pssh_out");
exports.takePSSHOut = take_pssh_out_1.default;
Object.defineProperty(exports, "getPsshSystemID", { enumerable: true, get: function () { return take_pssh_out_1.getPsshSystemID; } });
var create_box_1 = require("./create_box");
Object.defineProperty(exports, "createBox", { enumerable: true, get: function () { return create_box_1.createBox; } });
Object.defineProperty(exports, "createBoxWithChildren", { enumerable: true, get: function () { return create_box_1.createBoxWithChildren; } });
var get_box_1 = require("./get_box");
Object.defineProperty(exports, "getBox", { enumerable: true, get: function () { return get_box_1.getBox; } });
Object.defineProperty(exports, "getBoxContent", { enumerable: true, get: function () { return get_box_1.getBoxContent; } });
Object.defineProperty(exports, "getNextBoxOffsets", { enumerable: true, get: function () { return get_box_1.getNextBoxOffsets; } });
Object.defineProperty(exports, "getBoxOffsets", { enumerable: true, get: function () { return get_box_1.getBoxOffsets; } });
Object.defineProperty(exports, "getUuidContent", { enumerable: true, get: function () { return get_box_1.getUuidContent; } });
var read_1 = require("./read");
Object.defineProperty(exports, "getMDAT", { enumerable: true, get: function () { return read_1.getMDAT; } });
Object.defineProperty(exports, "getMDIA", { enumerable: true, get: function () { return read_1.getMDIA; } });
Object.defineProperty(exports, "getTRAF", { enumerable: true, get: function () { return read_1.getTRAF; } });
var utils_1 = require("./utils");
Object.defineProperty(exports, "getMDHDTimescale", { enumerable: true, get: function () { return utils_1.getMDHDTimescale; } });
Object.defineProperty(exports, "getPlayReadyKIDFromPrivateData", { enumerable: true, get: function () { return utils_1.getPlayReadyKIDFromPrivateData; } });
Object.defineProperty(exports, "getTrackFragmentDecodeTime", { enumerable: true, get: function () { return utils_1.getTrackFragmentDecodeTime; } });
Object.defineProperty(exports, "getDurationFromTrun", { enumerable: true, get: function () { return utils_1.getDurationFromTrun; } });
Object.defineProperty(exports, "getSegmentsFromSidx", { enumerable: true, get: function () { return utils_1.getSegmentsFromSidx; } });
Object.defineProperty(exports, "patchPssh", { enumerable: true, get: function () { return utils_1.patchPssh; } });
Object.defineProperty(exports, "updateBoxLength", { enumerable: true, get: function () { return utils_1.updateBoxLength; } });
