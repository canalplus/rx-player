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
var event_emitter_1 = require("../utils/event_emitter");
var global_scope_1 = require("../utils/global_scope");
var is_node_1 = require("../utils/is_node");
var is_null_or_undefined_1 = require("../utils/is_null_or_undefined");
var queue_microtask_1 = require("../utils/queue_microtask");
// TODO This is the last ugly side-effect here.
// Either remove it or find the best way to implement that
function patchWebkitSourceBuffer() {
    /* eslint-disable @typescript-eslint/no-unsafe-member-access */
    /* eslint-disable @typescript-eslint/no-unsafe-call */
    /* eslint-disable @typescript-eslint/no-explicit-any */
    // old WebKit SourceBuffer implementation,
    // where a synchronous append is used instead of appendBuffer
    if (!is_node_1.default &&
        !(0, is_null_or_undefined_1.default)(global_scope_1.default.WebKitSourceBuffer) &&
        global_scope_1.default.WebKitSourceBuffer.prototype.addEventListener === undefined) {
        /* eslint-enable @typescript-eslint/no-explicit-any */
        /* eslint-disable @typescript-eslint/no-unsafe-assignment */
        var sourceBufferWebkitRef = global_scope_1.default.WebKitSourceBuffer;
        var sourceBufferWebkitProto = sourceBufferWebkitRef.prototype;
        for (var fnName in event_emitter_1.default.prototype) {
            if (event_emitter_1.default.prototype.hasOwnProperty(fnName)) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                sourceBufferWebkitProto[fnName] = event_emitter_1.default.prototype[fnName];
            }
        }
        /* eslint-enable @typescript-eslint/no-unsafe-assignment */
        sourceBufferWebkitProto._listeners = [];
        sourceBufferWebkitProto._emitUpdate = function (eventName, val) {
            var _this = this;
            (0, queue_microtask_1.default)(function () {
                /* eslint-disable no-invalid-this */
                _this.trigger(eventName, val);
                _this.updating = false;
                _this.trigger("updateend");
                /* eslint-enable no-invalid-this */
            });
        };
        sourceBufferWebkitProto.appendBuffer = function (data) {
            /* eslint-disable no-invalid-this */
            // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
            if (this.updating) {
                throw new Error("updating");
            }
            this.trigger("updatestart");
            this.updating = true;
            try {
                this.append(data);
            }
            catch (error) {
                this._emitUpdate("error", error);
                return;
            }
            this._emitUpdate("update");
            /* eslint-enable no-invalid-this */
        };
    }
    /* eslint-enable @typescript-eslint/no-unsafe-member-access */
    /* eslint-enable @typescript-eslint/no-unsafe-call */
}
exports.default = patchWebkitSourceBuffer;
