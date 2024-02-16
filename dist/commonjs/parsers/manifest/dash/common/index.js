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
exports.TimelineRepresentationIndex = exports.TemplateRepresentationIndex = exports.ListRepresentationIndex = exports.BaseRepresentationIndex = void 0;
var indexes_1 = require("./indexes");
Object.defineProperty(exports, "BaseRepresentationIndex", { enumerable: true, get: function () { return indexes_1.BaseRepresentationIndex; } });
Object.defineProperty(exports, "ListRepresentationIndex", { enumerable: true, get: function () { return indexes_1.ListRepresentationIndex; } });
Object.defineProperty(exports, "TemplateRepresentationIndex", { enumerable: true, get: function () { return indexes_1.TemplateRepresentationIndex; } });
Object.defineProperty(exports, "TimelineRepresentationIndex", { enumerable: true, get: function () { return indexes_1.TimelineRepresentationIndex; } });
var parse_mpd_1 = require("./parse_mpd");
exports.default = parse_mpd_1.default;
