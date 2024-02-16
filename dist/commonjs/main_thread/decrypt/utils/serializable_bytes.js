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
var base64_1 = require("../../../utils/base64");
/** Wrap byte-based data and allow serialization of it into base64. */
var SerializableBytes = /** @class */ (function () {
    /**
     * Create a new `SerializableBytes`, wrapping the initialization data
     * given and allowing serialization into base64.
     * @param {Uint8Array} initData
     */
    function SerializableBytes(initData) {
        this.initData = initData;
    }
    /**
     * Convert it to base64.
     * `toJSON` is specially interpreted by JavaScript engines to be able to rely
     * on it when calling `JSON.stringify` on it or any of its parent objects:
     * https://tc39.es/ecma262/#sec-serializejsonproperty
     * @returns {string}
     */
    SerializableBytes.prototype.toJSON = function () {
        return (0, base64_1.bytesToBase64)(this.initData);
    };
    /**
     * Decode a base64 sequence representing an initialization data back to an
     * Uint8Array.
     * @param {string}
     * @returns {Uint8Array}
     */
    SerializableBytes.decode = function (base64) {
        return (0, base64_1.base64ToBytes)(base64);
    };
    return SerializableBytes;
}());
exports.default = SerializableBytes;
