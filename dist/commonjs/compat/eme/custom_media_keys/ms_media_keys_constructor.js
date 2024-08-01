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
exports.MSMediaKeysConstructor = void 0;
var global_scope_1 = require("../../../utils/global_scope");
var MSMediaKeysConstructor;
var MSMediaKeys = global_scope_1.default.MSMediaKeys;
if (MSMediaKeys !== undefined &&
    MSMediaKeys.prototype !== undefined &&
    typeof MSMediaKeys.isTypeSupported === "function" &&
    /* eslint-disable @typescript-eslint/no-unsafe-member-access */
    typeof MSMediaKeys.prototype.createSession === "function"
/* eslint-enable @typescript-eslint/no-unsafe-member-access */
) {
    exports.MSMediaKeysConstructor = MSMediaKeysConstructor = MSMediaKeys;
}
