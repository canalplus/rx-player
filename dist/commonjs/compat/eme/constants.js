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
exports.PSSH_TO_INTEGER = void 0;
var byte_parsing_1 = require("../../utils/byte_parsing");
var string_parsing_1 = require("../../utils/string_parsing");
// The way "pssh" will be written in ISOBMFF files
exports.PSSH_TO_INTEGER = (0, byte_parsing_1.be4toi)((0, string_parsing_1.strToUtf8)("pssh"), 0);
