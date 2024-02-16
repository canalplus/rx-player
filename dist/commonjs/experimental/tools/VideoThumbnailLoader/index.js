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
exports.MPL_LOADER = exports.DASH_LOADER = void 0;
var video_thumbnail_loader_1 = require("./video_thumbnail_loader");
Object.defineProperty(exports, "DASH_LOADER", { enumerable: true, get: function () { return video_thumbnail_loader_1.DASH_LOADER; } });
Object.defineProperty(exports, "MPL_LOADER", { enumerable: true, get: function () { return video_thumbnail_loader_1.MPL_LOADER; } });
exports.default = video_thumbnail_loader_1.default;
