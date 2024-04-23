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
exports.REGXP_TIME_TICK = exports.REGXP_TIME_HMS = exports.REGXP_TIME_FRAMES = exports.REGXP_TIME_COLON_MS = exports.REGXP_TIME_COLON_FRAMES = exports.REGXP_TIME_COLON = exports.REGXP_PERCENT_VALUES = exports.REGXP_LENGTH = exports.REGXP_RGBA_COLOR = exports.REGXP_RGB_COLOR = exports.REGXP_8_HEX_COLOR = exports.REGXP_4_HEX_COLOR = void 0;
// examples: 00:00:40:07 (7 frames) or 00:00:40:07.1 (7 frames, 1 subframe)
var REGXP_TIME_COLON_FRAMES = /^(\d{2,}):(\d{2}):(\d{2}):(\d{2})\.?(\d+)?$/;
exports.REGXP_TIME_COLON_FRAMES = REGXP_TIME_COLON_FRAMES;
// examples: 00:00:40:07 (7 frames) or 00:00:40:07.1 (7 frames, 1 subframe)
var REGXP_TIME_COLON = /^(?:(\d{2,}):)?(\d{2}):(\d{2})$/;
exports.REGXP_TIME_COLON = REGXP_TIME_COLON;
// examples: 01:02:43.0345555 or 02:43.03
var REGXP_TIME_COLON_MS = /^(?:(\d{2,}):)?(\d{2}):(\d{2}\.\d{2,})$/;
exports.REGXP_TIME_COLON_MS = REGXP_TIME_COLON_MS;
// examples: 75f or 75.5f
var REGXP_TIME_FRAMES = /^(\d*\.?\d*)f$/;
exports.REGXP_TIME_FRAMES = REGXP_TIME_FRAMES;
// examples: 50t or 50.5t
var REGXP_TIME_TICK = /^(\d*\.?\d*)t$/;
exports.REGXP_TIME_TICK = REGXP_TIME_TICK;
// examples: 3.45h, 3m or 4.20s
var REGXP_TIME_HMS = /^(?:(\d*\.?\d*)h)?(?:(\d*\.?\d*)m)?(?:(\d*\.?\d*)s)?(?:(\d*\.?\d*)ms)?$/;
exports.REGXP_TIME_HMS = REGXP_TIME_HMS;
// examples: 50% 10%
var REGXP_PERCENT_VALUES = /^(\d{1,2}|100)% (\d{1,2}|100)%$/;
exports.REGXP_PERCENT_VALUES = REGXP_PERCENT_VALUES;
var REGXP_LENGTH = /^((?:\+|\-)?\d*(?:\.\d+)?)(px|em|c|%|rh|rw)$/;
exports.REGXP_LENGTH = REGXP_LENGTH;
var REGXP_8_HEX_COLOR = /^#([0-9A-f]{2})([0-9A-f]{2})([0-9A-f]{2})([0-9A-f]{2})$/;
exports.REGXP_8_HEX_COLOR = REGXP_8_HEX_COLOR;
var REGXP_4_HEX_COLOR = /^#([0-9A-f])([0-9A-f])([0-9A-f])([0-9A-f])$/;
exports.REGXP_4_HEX_COLOR = REGXP_4_HEX_COLOR;
var REGXP_RGB_COLOR = /^rgb\( *(\d+) *, *(\d+) *, *(\d+) *\)/;
exports.REGXP_RGB_COLOR = REGXP_RGB_COLOR;
var REGXP_RGBA_COLOR = /^rgba\( *(\d+) *, *(\d+) *, *(\d+) *, *(\d+) *\)/;
exports.REGXP_RGBA_COLOR = REGXP_RGBA_COLOR;
