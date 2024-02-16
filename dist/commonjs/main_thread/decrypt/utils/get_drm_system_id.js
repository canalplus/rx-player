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
var starts_with_1 = require("../../../utils/starts_with");
/**
 * @param {string} keySystem
 * @returns {string|undefined}
 */
function getDrmSystemId(keySystem) {
    if ((0, starts_with_1.default)(keySystem, "com.microsoft.playready") ||
        keySystem === "com.chromecast.playready" ||
        keySystem === "com.youtube.playready") {
        return "9a04f07998404286ab92e65be0885f95";
    }
    if (keySystem === "com.widevine.alpha") {
        return "edef8ba979d64acea3c827dcd51d21ed";
    }
    if ((0, starts_with_1.default)(keySystem, "com.apple.fps")) {
        return "94ce86fb07ff4f43adb893d2fa968ca2";
    }
    if ((0, starts_with_1.default)(keySystem, "com.nagra.")) {
        return "adb41c242dbf4a6d958b4457c0d27b95";
    }
    return undefined;
}
exports.default = getDrmSystemId;
