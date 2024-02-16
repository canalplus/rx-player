import log from "../../../log";
import { CancellationError } from "../../../utils/task_canceller";
/**
 * Implementation of an `ITextDisplayerInterface` running in a WebWorker
 * (so, in a different thread than the `ITextDisplayer`).
 *
 * @class WorkerTextDisplayerInterface
 */
export default class WorkerTextDisplayerInterface {
    /**
     * @param {string} contentId
     * @param {Object} messageSender
     */
    constructor(contentId, messageSender) {
        this._contentId = contentId;
        this._messageSender = messageSender;
        this._queues = { pushTextData: [], remove: [] };
    }
    /**
     * @see ITextDisplayerInterface
     */
    pushTextData(infos) {
        return new Promise((resolve, reject) => {
            this._messageSender({
                type: "push-text-data" /* WorkerMessageType.PushTextData */,
                contentId: this._contentId,
                value: infos,
            });
            this._queues.pushTextData.push({ resolve, reject });
        });
    }
    /**
     * @see ITextDisplayerInterface
     */
    remove(start, end) {
        return new Promise((resolve, reject) => {
            this._messageSender({
                type: "remove-text-data" /* WorkerMessageType.RemoveTextData */,
                contentId: this._contentId,
                value: { start, end },
            });
            this._queues.remove.push({ resolve, reject });
        });
    }
    /**
     * @see ITextDisplayerInterface
     */
    reset() {
        this._messageSender({
            type: "reset-text-displayer" /* WorkerMessageType.ResetTextDisplayer */,
            contentId: this._contentId,
            value: null,
        });
        this._resetCurrentQueue();
    }
    /**
     * @see ITextDisplayerInterface
     */
    stop() {
        this._messageSender({
            type: "stop-text-displayer" /* WorkerMessageType.StopTextDisplayer */,
            contentId: this._contentId,
            value: null,
        });
        this._resetCurrentQueue();
    }
    _resetCurrentQueue() {
        const error = new CancellationError();
        this._queues.pushTextData.forEach((elt) => {
            elt.reject(error);
        });
        this._queues.remove.forEach((elt) => {
            elt.reject(error);
        });
    }
    /**
     * @param {Array.<Object>} ranges
     */
    onPushedTrackSuccess(ranges) {
        const element = this._queues.pushTextData.shift();
        if (element === undefined) {
            log.error("WMS: pushTextData success for inexistant operation");
            return;
        }
        element.resolve(ranges);
    }
    /**
     * @param {unknown} err
     */
    onPushedTrackError(err) {
        const element = this._queues.pushTextData.shift();
        if (element === undefined) {
            log.error("WMS: pushTextData error for inexistant operation");
            return;
        }
        element.reject(err);
    }
    /**
     * @param {Array.<Object>} ranges
     */
    onRemoveSuccess(ranges) {
        const element = this._queues.remove.shift();
        if (element === undefined) {
            log.error("WMS: remove success for inexistant operation");
            return;
        }
        element.resolve(ranges);
    }
    /**
     * @param {unknown} err
     */
    onRemoveError(err) {
        const element = this._queues.pushTextData.shift();
        if (element === undefined) {
            log.error("WMS: pushTextData error for inexistant operation");
            return;
        }
        element.reject(err);
    }
}
