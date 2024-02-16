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
 * WITHOUT WARRANTIE OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
Object.defineProperty(exports, "__esModule", { value: true });
var is_null_or_undefined_1 = require("../utils/is_null_or_undefined");
var features_object_1 = require("./features_object");
/**
 * @param {Array.<Object>} featureFuncList
 */
function addFeatures(featureFuncList) {
    for (var i = 0; i < featureFuncList.length; i++) {
        var addFeature = featureFuncList[i];
        if (typeof addFeature === "function") {
            addFeature(features_object_1.default);
        }
        else if (!(0, is_null_or_undefined_1.default)(addFeature) &&
            typeof addFeature._addFeature === "function") {
            addFeature._addFeature(features_object_1.default);
        }
        else {
            throw new Error("Unrecognized feature");
        }
    }
}
exports.default = addFeatures;
