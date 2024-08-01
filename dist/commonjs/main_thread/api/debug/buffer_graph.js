"use strict";
var __values = (this && this.__values) || function(o) {
    var s = typeof Symbol === "function" && Symbol.iterator, m = s && o[s], i = 0;
    if (m) return m.call(o);
    if (o && typeof o.length === "number") return {
        next: function () {
            if (o && i >= o.length) o = void 0;
            return { value: o && o[i++], done: !o };
        }
    };
    throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
};
Object.defineProperty(exports, "__esModule", { value: true });
var BUFFER_WIDTH_IN_SECONDS = 30 * 60;
var COLORS = [
    "#2ab7ca",
    "#fed766",
    "#4dd248",
    "#a22c28",
    "#556b2f", // darkolivegreen
    "#add8e6", // lightblue
    "#90ee90", // lightgreen
    "#444444",
    "#40bfc1",
    "#57557e",
    "#fbe555",
];
var SegmentSinkGraph = /** @class */ (function () {
    function SegmentSinkGraph(canvasElt) {
        this._colorMap = new Map();
        this._currNbColors = 0;
        this._canvasElt = canvasElt;
        this._canvasCtxt = this._canvasElt.getContext("2d");
        this.clear();
    }
    SegmentSinkGraph.prototype.clear = function () {
        if (this._canvasCtxt !== null) {
            this._canvasCtxt.clearRect(0, 0, this._canvasElt.width, this._canvasElt.height);
        }
    };
    SegmentSinkGraph.prototype.update = function (data) {
        var e_1, _a;
        var _this = this;
        var _b, _c, _d, _e;
        // Following logic clear the colorMap entries if they are not used anymore
        // to prevent memory usage.
        var representationStillInUse = new Set();
        data.inventory.forEach(function (chunk) {
            representationStillInUse.add(chunk.infos.representation.uniqueId);
        });
        this._colorMap.forEach(function (representationId) {
            if (!representationStillInUse.has(representationId)) {
                _this._colorMap.delete(representationId);
            }
        });
        if (this._canvasCtxt === null) {
            return;
        }
        var inventory = data.inventory, currentTime = data.currentTime, width = data.width, height = data.height;
        this._canvasElt.style.width = "".concat(width, "px");
        this._canvasElt.style.height = "".concat(height, "px");
        this._canvasElt.width = width;
        this._canvasElt.height = height;
        this.clear();
        var minimumPoint;
        if (data.minimumPosition !== undefined) {
            if (inventory.length > 0) {
                minimumPoint = Math.min(data.minimumPosition, inventory[0].start);
            }
            else {
                minimumPoint = data.minimumPosition;
            }
        }
        else {
            minimumPoint = (_c = (_b = inventory[0]) === null || _b === void 0 ? void 0 : _b.start) !== null && _c !== void 0 ? _c : 0;
        }
        var maximumPoint;
        if (data.maximumPosition !== undefined) {
            if (inventory.length > 0) {
                maximumPoint = Math.max(data.maximumPosition, inventory[inventory.length - 1].end);
            }
            else {
                maximumPoint = data.maximumPosition;
            }
        }
        else {
            maximumPoint = (_e = (_d = inventory[inventory.length - 1]) === null || _d === void 0 ? void 0 : _d.end) !== null && _e !== void 0 ? _e : 1000;
        }
        minimumPoint = Math.min(currentTime, minimumPoint);
        maximumPoint = Math.max(currentTime, maximumPoint);
        var minimumPosition;
        var maximumPosition;
        if (maximumPoint - minimumPoint > BUFFER_WIDTH_IN_SECONDS) {
            if (maximumPoint - currentTime < BUFFER_WIDTH_IN_SECONDS / 2) {
                maximumPosition = maximumPoint;
                minimumPosition = maximumPoint - BUFFER_WIDTH_IN_SECONDS;
            }
            else if (currentTime - minimumPoint < BUFFER_WIDTH_IN_SECONDS / 2) {
                minimumPosition = minimumPoint;
                maximumPosition = minimumPoint + BUFFER_WIDTH_IN_SECONDS;
            }
            else {
                minimumPosition = currentTime - BUFFER_WIDTH_IN_SECONDS / 2;
                maximumPosition = currentTime + BUFFER_WIDTH_IN_SECONDS / 2;
            }
        }
        else {
            minimumPosition = minimumPoint;
            maximumPosition = maximumPoint;
        }
        if (minimumPosition >= maximumPosition) {
            this.clear();
            return;
        }
        var currentRangesScaled = scaleSegments(inventory, minimumPosition, maximumPosition);
        try {
            for (var currentRangesScaled_1 = __values(currentRangesScaled), currentRangesScaled_1_1 = currentRangesScaled_1.next(); !currentRangesScaled_1_1.done; currentRangesScaled_1_1 = currentRangesScaled_1.next()) {
                var currentRange = currentRangesScaled_1_1.value;
                this._paintRange(currentRange, width, height);
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (currentRangesScaled_1_1 && !currentRangesScaled_1_1.done && (_a = currentRangesScaled_1.return)) _a.call(currentRangesScaled_1);
            }
            finally { if (e_1) throw e_1.error; }
        }
        if (currentTime !== undefined) {
            paintCurrentPosition(currentTime, minimumPosition, maximumPosition, this._canvasCtxt, width, height);
        }
    };
    /**
     * Paint a given range in the canvas
     * @param {Object} rangeScaled - Buffered segment information with added
     * "scaling" information to know where it fits in the canvas.
     */
    SegmentSinkGraph.prototype._paintRange = function (rangeScaled, width, height) {
        if (this._canvasCtxt === null) {
            return;
        }
        var startX = rangeScaled.scaledStart * width;
        var endX = rangeScaled.scaledEnd * width;
        this._canvasCtxt.fillStyle = this._getColorForRepresentation(rangeScaled.info.infos.representation);
        this._canvasCtxt.fillRect(Math.ceil(startX), 0, Math.ceil(endX - startX), height);
    };
    SegmentSinkGraph.prototype._getColorForRepresentation = function (representation) {
        var color = this._colorMap.get(representation.uniqueId);
        if (color !== undefined) {
            return color;
        }
        var newColor = COLORS[this._currNbColors % COLORS.length];
        this._currNbColors++;
        this._colorMap.set(representation.uniqueId, newColor);
        return newColor;
    };
    return SegmentSinkGraph;
}());
exports.default = SegmentSinkGraph;
/**
 * Represent the current position in the canvas.
 * @param {number|undefined} position - The current position
 * @param {number} minimumPosition - minimum possible position represented in
 * the canvas.
 * @param {number} maximumPosition - maximum possible position represented in
 * the canvas.
 * @param {Object} canvasCtx - The canvas' 2D context
 */
function paintCurrentPosition(position, minimumPosition, maximumPosition, canvasCtx, width, height) {
    if (typeof position === "number" &&
        position >= minimumPosition &&
        position < maximumPosition) {
        var lengthCanvas = maximumPosition - minimumPosition;
        canvasCtx.fillStyle = "#FF0000";
        canvasCtx.fillRect(Math.ceil(((position - minimumPosition) / lengthCanvas) * width) - 1, 5, 5, height);
    }
}
/**
 * Scale given bufferedData in terms of percentage between the minimum and
 * maximum position. Filter out ranges which are not part of it.
 * @param {Array.<Object>} bufferedData
 * @param {number} minimumPosition
 * @param {number} maximumPosition
 * @returns {Array.<Object>}
 */
function scaleSegments(bufferedData, minimumPosition, maximumPosition) {
    var e_2, _a;
    var _b, _c;
    var scaledSegments = [];
    var wholeDuration = maximumPosition - minimumPosition;
    try {
        for (var bufferedData_1 = __values(bufferedData), bufferedData_1_1 = bufferedData_1.next(); !bufferedData_1_1.done; bufferedData_1_1 = bufferedData_1.next()) {
            var info = bufferedData_1_1.value;
            var start = (_b = info.bufferedStart) !== null && _b !== void 0 ? _b : info.start;
            var end = (_c = info.bufferedEnd) !== null && _c !== void 0 ? _c : info.end;
            if (end > minimumPosition && start < maximumPosition) {
                var startPoint = Math.max(start - minimumPosition, 0);
                var endPoint = Math.min(end - minimumPosition, maximumPosition);
                var scaledStart = startPoint / wholeDuration;
                var scaledEnd = endPoint / wholeDuration;
                scaledSegments.push({ scaledStart: scaledStart, scaledEnd: scaledEnd, info: info });
            }
        }
    }
    catch (e_2_1) { e_2 = { error: e_2_1 }; }
    finally {
        try {
            if (bufferedData_1_1 && !bufferedData_1_1.done && (_a = bufferedData_1.return)) _a.call(bufferedData_1);
        }
        finally { if (e_2) throw e_2.error; }
    }
    return scaledSegments;
}
