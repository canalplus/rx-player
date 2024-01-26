import type {
  ISegmentSinksStore,
  IStreamOrchestratorPlaybackObservation,
} from "../../../core/types";
import log from "../../../log";
import type { IManifest, IPeriod } from "../../../manifest";
import type { IMediaSourceInterface } from "../../../mse";
import type { IReadOnlyPlaybackObserver } from "../../../playback_observer";
import type { IPlayerError } from "../../../public_types";
import type { CancellationSignal } from "../../../utils/task_canceller";
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
 * @param {MediaSource} mediaSource
 * @param {Object} streamObserver
 * @param {Object} segmentSinksStore
 * @param {Object} cancelSignal
 * @returns {Object}
 */
export default function createContentTimeBoundariesObserver(
  manifest: IManifest,
  mediaSource: IMediaSourceInterface,
  streamObserver: IReadOnlyPlaybackObserver<IStreamOrchestratorPlaybackObservation>,
  segmentSinksStore: ISegmentSinksStore,
  callbacks: IContentTimeBoundariesObserverCallbacks,
  cancelSignal: CancellationSignal,
): ContentTimeBoundariesObserver {
  cancelSignal.register(() => {
    mediaSource.interruptDurationSetting();
  });
  const contentTimeBoundariesObserver = new ContentTimeBoundariesObserver(
    manifest,
    streamObserver,
    segmentSinksStore.getBufferTypes(),
  );
  cancelSignal.register(() => {
    contentTimeBoundariesObserver.dispose();
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
