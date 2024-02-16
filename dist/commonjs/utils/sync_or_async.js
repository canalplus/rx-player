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
var noop_1 = require("./noop");
var SyncOrAsync = {
    /**
     * Create the synchronous variant of an `ISyncOrAsyncValue`.
     * @param {*} val
     * @returns {Object}
     */
    createSync: function (val) {
        return {
            syncValue: val,
            getValueAsAsync: function () {
                return Promise.resolve(val);
            },
        };
    },
    /**
     * Create the asynchronous variant of an `ISyncOrAsyncValue`.
     * @param {Promise} val
     * @returns {Object}
     */
    createAsync: function (val) {
        var ret = null;
        val.then(function (resolved) {
            ret = resolved;
        }, noop_1.default);
        return {
            syncValue: ret,
            getValueAsAsync: function () {
                return val;
            },
        };
    },
};
exports.default = SyncOrAsync;
