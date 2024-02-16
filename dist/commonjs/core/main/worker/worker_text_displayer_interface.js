"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var log_1 = require("../../../log");
var task_canceller_1 = require("../../../utils/task_canceller");
/**
 * Implementation of an `ITextDisplayerInterface` running in a WebWorker
 * (so, in a different thread than the `ITextDisplayer`).
 *
 * @class WorkerTextDisplayerInterface
 */
var WorkerTextDisplayerInterface = /** @class */ (function () {
    /**
     * @param {string} contentId
     * @param {Object} messageSender
     */
    function WorkerTextDisplayerInterface(contentId, messageSender) {
        this._contentId = contentId;
        this._messageSender = messageSender;
        this._queues = { pushTextData: [], remove: [] };
    }
    /**
     * @see ITextDisplayerInterface
     */
    WorkerTextDisplayerInterface.prototype.pushTextData = function (infos) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            _this._messageSender({
                type: "push-text-data" /* WorkerMessageType.PushTextData */,
                contentId: _this._contentId,
                value: infos,
            });
            _this._queues.pushTextData.push({ resolve: resolve, reject: reject });
        });
    };
    /**
     * @see ITextDisplayerInterface
     */
    WorkerTextDisplayerInterface.prototype.remove = function (start, end) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            _this._messageSender({
                type: "remove-text-data" /* WorkerMessageType.RemoveTextData */,
                contentId: _this._contentId,
                value: { start: start, end: end },
            });
            _this._queues.remove.push({ resolve: resolve, reject: reject });
        });
    };
    /**
     * @see ITextDisplayerInterface
     */
    WorkerTextDisplayerInterface.prototype.reset = function () {
        this._messageSender({
            type: "reset-text-displayer" /* WorkerMessageType.ResetTextDisplayer */,
            contentId: this._contentId,
            value: null,
        });
        this._resetCurrentQueue();
    };
    /**
     * @see ITextDisplayerInterface
     */
    WorkerTextDisplayerInterface.prototype.stop = function () {
        this._messageSender({
            type: "stop-text-displayer" /* WorkerMessageType.StopTextDisplayer */,
            contentId: this._contentId,
            value: null,
        });
        this._resetCurrentQueue();
    };
    WorkerTextDisplayerInterface.prototype._resetCurrentQueue = function () {
        var error = new task_canceller_1.CancellationError();
        this._queues.pushTextData.forEach(function (elt) {
            elt.reject(error);
        });
        this._queues.remove.forEach(function (elt) {
            elt.reject(error);
        });
    };
    /**
     * @param {Array.<Object>} ranges
     */
    WorkerTextDisplayerInterface.prototype.onPushedTrackSuccess = function (ranges) {
        var element = this._queues.pushTextData.shift();
        if (element === undefined) {
            log_1.default.error("WMS: pushTextData success for inexistant operation");
            return;
        }
        element.resolve(ranges);
    };
    /**
     * @param {unknown} err
     */
    WorkerTextDisplayerInterface.prototype.onPushedTrackError = function (err) {
        var element = this._queues.pushTextData.shift();
        if (element === undefined) {
            log_1.default.error("WMS: pushTextData error for inexistant operation");
            return;
        }
        element.reject(err);
    };
    /**
     * @param {Array.<Object>} ranges
     */
    WorkerTextDisplayerInterface.prototype.onRemoveSuccess = function (ranges) {
        var element = this._queues.remove.shift();
        if (element === undefined) {
            log_1.default.error("WMS: remove success for inexistant operation");
            return;
        }
        element.resolve(ranges);
    };
    /**
     * @param {unknown} err
     */
    WorkerTextDisplayerInterface.prototype.onRemoveError = function (err) {
        var element = this._queues.pushTextData.shift();
        if (element === undefined) {
            log_1.default.error("WMS: pushTextData error for inexistant operation");
            return;
        }
        element.reject(err);
    };
    return WorkerTextDisplayerInterface;
}());
exports.default = WorkerTextDisplayerInterface;
