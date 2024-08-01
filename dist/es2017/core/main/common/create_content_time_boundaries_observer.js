import log from "../../../log";
import ContentTimeBoundariesObserver from "./content_time_boundaries_observer";
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
export default function createContentTimeBoundariesObserver(manifest, mediaSource, streamObserver, segmentSinksStore, callbacks, cancelSignal) {
    cancelSignal.register(() => {
        mediaSource.interruptDurationSetting();
    });
    const contentTimeBoundariesObserver = new ContentTimeBoundariesObserver(manifest, streamObserver, segmentSinksStore.getBufferTypes());
    cancelSignal.register(() => {
        contentTimeBoundariesObserver.dispose();
    });
    contentTimeBoundariesObserver.addEventListener("warning", (err) => callbacks.onWarning(err));
    contentTimeBoundariesObserver.addEventListener("periodChange", (period) => callbacks.onPeriodChanged(period));
    contentTimeBoundariesObserver.addEventListener("endingPositionChange", (evt) => {
        mediaSource.setDuration(evt.endingPosition, evt.isEnd);
    });
    contentTimeBoundariesObserver.addEventListener("endOfStream", () => {
        log.debug("Init: end-of-stream order received.");
        mediaSource.maintainEndOfStream();
    });
    contentTimeBoundariesObserver.addEventListener("resumeStream", () => {
        mediaSource.stopEndOfStream();
    });
    const obj = contentTimeBoundariesObserver.getCurrentEndingTime();
    mediaSource.setDuration(obj.endingPosition, obj.isEnd);
    return contentTimeBoundariesObserver;
}
