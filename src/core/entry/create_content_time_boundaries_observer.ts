import type {
  ISegmentSinksStore,
  IStreamOrchestratorMediaObservation,
} from "../../core/types";
import log from "../../log";
import type { IManifest, IPeriod } from "../../manifest";
import type { IReadOnlyMediaElementMonitor } from "../../media_element_monitor";
import type { IMediaSourceInterface } from "../../mse";
import type { IPlayerError } from "../../public_types";
import type { CancellationSignal } from "../../utils/task_canceller";
import ContentTimeBoundariesObserver from "./content_time_boundaries_observer";

export interface IContentTimeBoundariesObserverCallbacks {
  onWarning: (evt: IPlayerError) => void;
  onPeriodChanged: (period: IPeriod) => void;
}

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
 * @param {Object} mediaElementMonitor
 * @param {Object} segmentSinksStore
 * @param {Object} cancelSignal
 * @returns {Object}
 */
export default function createContentTimeBoundariesObserver(
  manifest: IManifest,
  mediaSource: IMediaSourceInterface,
  mediaElementMonitor: IReadOnlyMediaElementMonitor<IStreamOrchestratorMediaObservation>,
  segmentSinksStore: ISegmentSinksStore,
  callbacks: IContentTimeBoundariesObserverCallbacks,
  cancelSignal: CancellationSignal,
): ContentTimeBoundariesObserver {
  cancelSignal.register((err) => {
    mediaSource.interruptDurationSetting(err.reason);
  });
  const contentTimeBoundariesObserver = new ContentTimeBoundariesObserver(
    manifest,
    mediaElementMonitor,
    segmentSinksStore.getBufferTypes(),
  );
  cancelSignal.register((err) => {
    contentTimeBoundariesObserver.dispose(err.reason);
  });
  contentTimeBoundariesObserver.addEventListener("warning", (err) =>
    callbacks.onWarning(err),
  );
  contentTimeBoundariesObserver.addEventListener("periodChange", (period) =>
    callbacks.onPeriodChanged(period),
  );
  contentTimeBoundariesObserver.addEventListener("endingPositionChange", (evt) => {
    mediaSource.setDuration(evt.endingPosition, evt.isEnd);
  });
  contentTimeBoundariesObserver.addEventListener("endOfStream", () => {
    log.debug("mse", "Start applying end-of-stream order.");
    mediaSource.maintainEndOfStream();
  });
  contentTimeBoundariesObserver.addEventListener("resumeStream", () => {
    mediaSource.stopEndOfStream();
  });
  const obj = contentTimeBoundariesObserver.getCurrentEndingTime();
  mediaSource.setDuration(obj.endingPosition, obj.isEnd);
  return contentTimeBoundariesObserver;
}
