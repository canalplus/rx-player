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
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getKeySystemConfiguration = exports.disposeDecryptionResources = exports.clearOnStop = void 0;
/**
 * /!\ This file is feature-switchable.
 * It always should be imported through the `features` object.
 */
var clear_on_stop_1 = require("./clear_on_stop");
exports.clearOnStop = clear_on_stop_1.default;
var content_decryptor_1 = require("./content_decryptor");
var dispose_decryption_resources_1 = require("./dispose_decryption_resources");
exports.disposeDecryptionResources = dispose_decryption_resources_1.default;
var get_key_system_configuration_1 = require("./get_key_system_configuration");
exports.getKeySystemConfiguration = get_key_system_configuration_1.default;
__exportStar(require("./types"), exports);
exports.default = content_decryptor_1.default;
