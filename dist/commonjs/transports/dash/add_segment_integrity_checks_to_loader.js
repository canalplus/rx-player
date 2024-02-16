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
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
Object.defineProperty(exports, "__esModule", { value: true });
var task_canceller_1 = require("../../utils/task_canceller");
var check_isobmff_integrity_1 = require("../utils/check_isobmff_integrity");
var infer_segment_container_1 = require("../utils/infer_segment_container");
/**
 * Add multiple checks on the response given by the `segmentLoader` in argument.
 * If the response appear to be corrupted, the returned Promise will reject with
 * an error with an `INTEGRITY_ERROR` code.
 * @param {Function} segmentLoader
 * @returns {Function}
 */
function addSegmentIntegrityChecks(segmentLoader) {
    return function (url, context, loaderOptions, initialCancelSignal, callbacks) {
        return new Promise(function (resolve, reject) {
            var requestCanceller = new task_canceller_1.default();
            var unlinkCanceller = requestCanceller.linkToSignal(initialCancelSignal);
            requestCanceller.signal.register(reject);
            segmentLoader(url, context, loaderOptions, requestCanceller.signal, __assign(__assign({}, callbacks), { onNewChunk: function (data) {
                    try {
                        trowOnIntegrityError(data);
                        callbacks.onNewChunk(data);
                    }
                    catch (err) {
                        // Do not reject with a `CancellationError` after cancelling the request
                        cleanUpCancellers();
                        // Cancel the request
                        requestCanceller.cancel();
                        // Reject with thrown error
                        reject(err);
                    }
                } })).then(function (info) {
                cleanUpCancellers();
                if (requestCanceller.isUsed()) {
                    return;
                }
                if (info.resultType === "segment-loaded") {
                    try {
                        trowOnIntegrityError(info.resultData.responseData);
                    }
                    catch (err) {
                        reject(err);
                        return;
                    }
                }
                resolve(info);
            }, function (err) {
                cleanUpCancellers();
                reject(err);
            });
            function cleanUpCancellers() {
                requestCanceller.signal.deregister(reject);
                unlinkCanceller();
            }
        });
        /**
         * If the data's seems to be corrupted, throws an `INTEGRITY_ERROR` error.
         * @param {*} data
         */
        function trowOnIntegrityError(data) {
            if ((!(data instanceof ArrayBuffer) && !(data instanceof Uint8Array)) ||
                (0, infer_segment_container_1.default)(context.type, context.mimeType) !== "mp4") {
                return;
            }
            (0, check_isobmff_integrity_1.default)(new Uint8Array(data), context.segment.isInit);
        }
    };
}
exports.default = addSegmentIntegrityChecks;
