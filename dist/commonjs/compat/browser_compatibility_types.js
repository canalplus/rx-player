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
exports.READY_STATES = exports.MediaSource_ = void 0;
var global_scope_1 = require("../utils/global_scope");
var is_null_or_undefined_1 = require("../utils/is_null_or_undefined");
/* eslint-disable */
/** MediaSource implementation, including vendored implementations. */
var gs = global_scope_1.default;
var MediaSource_ = gs === undefined
    ? undefined
    : !(0, is_null_or_undefined_1.default)(gs.MediaSource)
        ? gs.MediaSource
        : !(0, is_null_or_undefined_1.default)(gs.MozMediaSource)
            ? gs.MozMediaSource
            : !(0, is_null_or_undefined_1.default)(gs.WebKitMediaSource)
                ? gs.WebKitMediaSource
                : gs.MSMediaSource;
exports.MediaSource_ = MediaSource_;
/* eslint-enable */
/** List an HTMLMediaElement's possible values for its readyState property. */
var READY_STATES = {
    HAVE_NOTHING: 0,
    HAVE_METADATA: 1,
    HAVE_CURRENT_DATA: 2,
    HAVE_FUTURE_DATA: 3,
    HAVE_ENOUGH_DATA: 4,
};
exports.READY_STATES = READY_STATES;
