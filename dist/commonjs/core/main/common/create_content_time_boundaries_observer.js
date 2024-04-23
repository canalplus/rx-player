"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var log_1 = require("../../../log");
var content_time_boundaries_observer_1 = require("./content_time_boundaries_observer");
/**
 * Creates a `ContentTimeBoundariesObserver`, a class indicating various
 * events related to media time (such as duration updates, period changes,
 * warnings about being out of the Manifest time boundaries or "endOfStream"
 * management), handle those events and returns the class.
 *
 * Various methods from that class need then to be called at various events
 * (see `ContentTimeBoundariesObserver`).
 * @param {Object} manifest
 * @param {Object} mediaSource
 * @param {Object} streamObserver
 * @param {Object} segmentSinksStore
 * @param {Object} cancelSignal
 * @returns {Object}
 */
function createContentTimeBoundariesObserver(manifest, mediaSource, streamObserver, segmentSinksStore, callbacks, cancelSignal) {
    cancelSignal.register(function () {
        mediaSource.interruptDurationSetting();
    });
    var contentTimeBoundariesObserver = new content_time_boundaries_observer_1.default(manifest, streamObserver, segmentSinksStore.getBufferTypes());
    cancelSignal.register(function () {
        contentTimeBoundariesObserver.dispose();
    });
    contentTimeBoundariesObserver.addEventListener("warning", function (err) {
        return callbacks.onWarning(err);
    });
    contentTimeBoundariesObserver.addEventListener("periodChange", function (period) {
        return callbacks.onPeriodChanged(period);
    });
    contentTimeBoundariesObserver.addEventListener("endingPositionChange", function (evt) {
        mediaSource.setDuration(evt.endingPosition, evt.isEnd);
    });
    contentTimeBoundariesObserver.addEventListener("endOfStream", function () {
        log_1.default.debug("Init: end-of-stream order received.");
        mediaSource.maintainEndOfStream();
    });
    contentTimeBoundariesObserver.addEventListener("resumeStream", function () {
        mediaSource.stopEndOfStream();
    });
    var obj = contentTimeBoundariesObserver.getCurrentEndingTime();
    mediaSource.setDuration(obj.endingPosition, obj.isEnd);
    return contentTimeBoundariesObserver;
}
exports.default = createContentTimeBoundariesObserver;
