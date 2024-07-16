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
var decodingInfo_1 = require("./decodingInfo");
var DRMInfos_1 = require("./DRMInfos");
var HDCPPolicy_1 = require("./HDCPPolicy");
var mediaContentType_1 = require("./mediaContentType");
var mediaContentTypeWithFeatures_1 = require("./mediaContentTypeWithFeatures");
var mediaDisplayInfos_1 = require("./mediaDisplayInfos");
var probers = {
    isTypeSupported: mediaContentType_1.default,
    isTypeSupportedWithFeatures: mediaContentTypeWithFeatures_1.default,
    matchMedia: mediaDisplayInfos_1.default,
    decodingInfos: decodingInfo_1.default,
    requestMediaKeySystemAccess: DRMInfos_1.default,
    getStatusForPolicy: HDCPPolicy_1.default,
};
exports.default = probers;
