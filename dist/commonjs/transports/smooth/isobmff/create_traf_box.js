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
var isobmff_1 = require("../../../parsers/containers/isobmff");
var create_boxes_1 = require("./create_boxes");
function createTrafBox(tfhd, tfdt, trun, mfhd, senc) {
    var trafs = [tfhd, tfdt, trun];
    if (senc !== undefined) {
        trafs.push((0, isobmff_1.createBox)("senc", senc), (0, create_boxes_1.createSAIZBox)(senc), (0, create_boxes_1.createSAIOBox)(mfhd, tfhd, tfdt, trun));
    }
    return (0, isobmff_1.createBoxWithChildren)("traf", trafs);
}
exports.default = createTrafBox;
