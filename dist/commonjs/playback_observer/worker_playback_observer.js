"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var generate_read_only_observer_1 = require("./utils/generate_read_only_observer");
var WorkerPlaybackObserver = /** @class */ (function () {
    function WorkerPlaybackObserver(src, contentId, sendMessage, cancellationSignal) {
        this._src = src;
        this._contentId = contentId;
        this._messageSender = sendMessage;
        this._cancelSignal = cancellationSignal;
    }
    WorkerPlaybackObserver.prototype.getCurrentTime = function () {
        return undefined;
    };
    WorkerPlaybackObserver.prototype.getReadyState = function () {
        return undefined;
    };
    WorkerPlaybackObserver.prototype.getIsPaused = function () {
        return undefined;
    };
    WorkerPlaybackObserver.prototype.getReference = function () {
        return this._src;
    };
    WorkerPlaybackObserver.prototype.setPlaybackRate = function (playbackRate) {
        this._messageSender({
            type: "update-playback-rate" /* WorkerMessageType.UpdatePlaybackRate */,
            contentId: this._contentId,
            value: playbackRate,
        });
    };
    WorkerPlaybackObserver.prototype.getPlaybackRate = function () {
        return undefined;
    };
    WorkerPlaybackObserver.prototype.listen = function (cb, options) {
        var _a;
        if (this._cancelSignal.isCancelled() ||
            ((_a = options === null || options === void 0 ? void 0 : options.clearSignal) === null || _a === void 0 ? void 0 : _a.isCancelled()) === true) {
            return;
        }
        this._src.onUpdate(cb, {
            clearSignal: options === null || options === void 0 ? void 0 : options.clearSignal,
            emitCurrentValue: options === null || options === void 0 ? void 0 : options.includeLastObservation,
        });
    };
    WorkerPlaybackObserver.prototype.deriveReadOnlyObserver = function (transform) {
        return (0, generate_read_only_observer_1.default)(this, transform, this._cancelSignal);
    };
    return WorkerPlaybackObserver;
}());
exports.default = WorkerPlaybackObserver;
