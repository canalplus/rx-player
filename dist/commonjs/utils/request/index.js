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
exports.RequestErrorTypes = exports.RequestError = exports.xhr = exports.fetchRequest = exports.fetchIsSupported = void 0;
var fetch_1 = require("./fetch");
exports.fetchRequest = fetch_1.default;
Object.defineProperty(exports, "fetchIsSupported", { enumerable: true, get: function () { return fetch_1.fetchIsSupported; } });
var request_error_1 = require("./request_error");
exports.RequestError = request_error_1.default;
Object.defineProperty(exports, "RequestErrorTypes", { enumerable: true, get: function () { return request_error_1.RequestErrorTypes; } });
var xhr_1 = require("./xhr");
exports.xhr = xhr_1.default;
exports.default = xhr_1.default;
