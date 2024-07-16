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
exports.SegmentSinkOperation = exports.SegmentSink = void 0;
var inventory_1 = require("../inventory");
/**
 * Class allowing to push segments and remove data to a buffer to be able
 * to decode them in the future as well as retrieving information about which
 * segments have already been pushed.
 *
 * A `SegmentSink` can rely on a browser's SourceBuffer as well as being
 * entirely defined in the code.
 *
 * A SegmentSink is associated to a given "bufferType" (e.g. "audio",
 * "video", "text") and allows to push segments as well as removing part of
 * already-pushed segments for that type.
 *
 * Because a segment can be divided into multiple chunks, one should call the
 * `signalSegmentComplete` method once all chunks of a given segment have been
 * pushed (through the `pushChunk` method) to validate that a segment has been
 * completely pushed.
 * It is expected to push chunks from only one segment at a time before calling
 * the `signalSegmentComplete` function for that segment. Pushing chunks from
 * multiple segments in parallel could have unexpected result depending on the
 * underlying implementation.
 * TODO reflect that in the API?
 *
 * A SegmentSink also maintains an "inventory", which is the current
 * list of segments contained in the underlying buffer.
 * This inventory has to be manually "synchronized" (through the
 * `synchronizeInventory` method) before being retrieved (through the
 * `getInventory` method).
 *
 * Also depending on the underlying implementation, the various operations
 * performed on a `SegmentSink` (push/remove/segmentComplete) can happen
 * synchronously or asynchronously.
 *
 * You can retrieve the current queue of operations by calling the
 * `getPendingOperations` method.
 * If operations happens synchronously, this method will just return an empty
 * array.
 */
var SegmentSink = /** @class */ (function () {
    function SegmentSink() {
        // Use SegmentInventory by default for inventory purposes
        this._segmentInventory = new inventory_1.default();
    }
    /**
     * The maintained inventory can fall out of sync from garbage collection or
     * other events.
     *
     * This methods allow to manually trigger a synchronization by providing the
     * buffered time ranges of the real SourceBuffer implementation.
     */
    SegmentSink.prototype.synchronizeInventory = function (ranges) {
        // The default implementation just use the SegmentInventory
        this._segmentInventory.synchronizeBuffered(ranges);
    };
    /**
     * Returns an inventory of the last known segments to be currently contained in
     * the SegmentSink.
     *
     * /!\ Note that this data may not be up-to-date with the real current content
     * of the SegmentSink.
     * Generally speaking, pushed segments are added right away to it but segments
     * may have been since removed, which might not be known right away.
     * Please consider this when using this method, by considering that it does
     * not reflect the full reality of the underlying buffer.
     * @returns {Array.<Object>}
     */
    SegmentSink.prototype.getLastKnownInventory = function () {
        // The default implementation just use the SegmentInventory
        return this._segmentInventory.getInventory();
    };
    /**
     * Returns a recent history of registered operations performed and event
     * received linked to the segment given in argument.
     *
     * Not all operations and events are registered in the returned history.
     * Please check the return type for more information on what is available.
     *
     * Note that history is short-lived for memory usage and performance reasons.
     * You may not receive any information on operations that happened too long
     * ago.
     * @param {Object} context
     * @returns {Array.<Object>}
     */
    SegmentSink.prototype.getSegmentHistory = function (context) {
        return this._segmentInventory.getHistoryFor(context);
    };
    return SegmentSink;
}());
exports.SegmentSink = SegmentSink;
/**
 * Enum used by a SegmentSink as a discriminant in its queue of
 * "operations".
 */
var SegmentSinkOperation;
(function (SegmentSinkOperation) {
    SegmentSinkOperation[SegmentSinkOperation["Push"] = 0] = "Push";
    SegmentSinkOperation[SegmentSinkOperation["Remove"] = 1] = "Remove";
    SegmentSinkOperation[SegmentSinkOperation["SignalSegmentComplete"] = 2] = "SignalSegmentComplete";
})(SegmentSinkOperation || (exports.SegmentSinkOperation = SegmentSinkOperation = {}));
