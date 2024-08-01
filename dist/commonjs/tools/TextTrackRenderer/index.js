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
exports.VTT_PARSER = exports.TTML_PARSER = exports.SRT_PARSER = exports.SAMI_PARSER = void 0;
var text_track_renderer_1 = require("./text_track_renderer");
// -- exported parsers --
var html_sami_parser_1 = require("../../features/list/html_sami_parser");
Object.defineProperty(exports, "SAMI_PARSER", { enumerable: true, get: function () { return html_sami_parser_1.HTML_SAMI_PARSER; } });
var html_srt_parser_1 = require("../../features/list/html_srt_parser");
Object.defineProperty(exports, "SRT_PARSER", { enumerable: true, get: function () { return html_srt_parser_1.HTML_SRT_PARSER; } });
var html_ttml_parser_1 = require("../../features/list/html_ttml_parser");
Object.defineProperty(exports, "TTML_PARSER", { enumerable: true, get: function () { return html_ttml_parser_1.HTML_TTML_PARSER; } });
var html_vtt_parser_1 = require("../../features/list/html_vtt_parser");
Object.defineProperty(exports, "VTT_PARSER", { enumerable: true, get: function () { return html_vtt_parser_1.HTML_VTT_PARSER; } });
exports.default = text_track_renderer_1.default;
