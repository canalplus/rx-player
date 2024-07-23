"use strict";
var __read = (this && this.__read) || function (o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o), r, ar = [], e;
    try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    }
    catch (error) { e = { error: error }; }
    finally {
        try {
            if (r && !r.done && (m = i["return"])) m.call(i);
        }
        finally { if (e) throw e.error; }
    }
    return ar;
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
var monotonic_timestamp_1 = require("../../../utils/monotonic_timestamp");
/**
 * Maximum history of the buffer size that will be displayed, in milliseconds.
 * For example, a value of `3000` indicates that we will just show at most the
 * buffer size evolution during the last 3 seconds.
 */
var TIME_SAMPLES_MS = 30000;
/**
 * At minimum, that value will be taken in the chart as a maximum buffer size,
 * in seconds.
 * If samples go higher than this size, the chart will adapt automatically to
 * a higher scale.
 * However if values go below that value, the chart won't scale down more than
 * this.
 */
var MINIMUM_MAX_BUFFER_SIZE = 20;
var BufferSizeGraph = /** @class */ (function () {
    function BufferSizeGraph(canvasElt) {
        this._canvasElt = canvasElt;
        this._canvasCtxt = this._canvasElt.getContext("2d");
        this._history = [];
    }
    BufferSizeGraph.prototype.pushBufferSize = function (bufferSize) {
        var now = (0, monotonic_timestamp_1.default)();
        this._history.push({ timestamp: now, bufferSize: bufferSize });
        if (this._history.length > 0) {
            var minimumTime = now - TIME_SAMPLES_MS;
            var i = void 0;
            for (i = this._history.length - 1; i >= 1; i--) {
                if (this._history[i].timestamp <= minimumTime) {
                    break;
                }
            }
            this._history = this._history.slice(i);
        }
        else {
            this._history = [];
        }
    };
    BufferSizeGraph.prototype.clear = function () {
        if (this._canvasCtxt !== null) {
            this._canvasCtxt.clearRect(0, 0, this._canvasElt.width, this._canvasElt.height);
        }
    };
    BufferSizeGraph.prototype.reRender = function (width, height) {
        this._canvasElt.style.width = "".concat(width, "px");
        this._canvasElt.style.height = "".concat(height, "px");
        this._canvasElt.width = width;
        this._canvasElt.height = height;
        this.clear();
        var history = this._history;
        var canvasCtx = this._canvasCtxt;
        if (history.length === 0) {
            return;
        }
        var currentMaxSize = getNewMaxBufferSize();
        var minDate = history[0].timestamp;
        var gridHeight = height / currentMaxSize;
        var gridWidth = width / TIME_SAMPLES_MS;
        drawData();
        /**
         * Get more appropriate maximum buffer size to put on top of the graph
         * according to current history.
         */
        function getNewMaxBufferSize() {
            var maxPoint = Math.max.apply(Math, __spreadArray([], __read(history.map(function (d) { return d.bufferSize; })), false));
            return Math.max(maxPoint + 5, MINIMUM_MAX_BUFFER_SIZE);
        }
        /**
         * Draw all data contained in `history` in the canvas given.
         */
        function drawData() {
            if (canvasCtx === null) {
                return;
            }
            canvasCtx.beginPath();
            canvasCtx.fillStyle = "rgb(200, 100, 200)";
            for (var i = 1; i < history.length; i++) {
                var diff = dateToX(history[i].timestamp) - dateToX(history[i - 1].timestamp);
                var y = height - bufferValueToHeight(history[i].bufferSize);
                canvasCtx.fillRect(dateToX(history[i - 1].timestamp), y, diff, height);
            }
            canvasCtx.stroke();
        }
        /**
         * Convert a value of a given data point, to a u coordinate in the canvas.
         * @param {number} bufferVal - Value to convert
         * @returns {number} - y coordinate
         */
        function bufferValueToHeight(bufferVal) {
            return height - (currentMaxSize - bufferVal) * gridHeight;
        }
        /**
         * Convert a date of a given data point, to a x coordinate in the canvas.
         * @param {number} date - Date to convert, in milliseconds
         * @returns {number} - x coordinate
         */
        function dateToX(date) {
            return (date - minDate) * gridWidth;
        }
    };
    return BufferSizeGraph;
}());
exports.default = BufferSizeGraph;
