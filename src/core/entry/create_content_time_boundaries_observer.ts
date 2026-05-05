import type {
  ISegmentSinksStore,
  IStreamOrchestratorPlaybackObservation,
} from "../../core/types.ts";
import log from "../../log.ts";
import type { IManifest, IPeriod } from "../../manifest/index.ts";
import type { IMediaSourceInterface } from "../../mse/index.ts";
import type { IReadOnlyPlaybackObserver } from "../../playback_observer/index.ts";
import type { IPlayerError } from "../../public_types.ts";
import type { CancellationSignal } from "../../utils/task_canceller.ts";
import ContentTimeBoundariesObserver from "./content_time_boundaries_observer.ts";

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
  cancelSignal.register((err) => {
    mediaSource.interruptDurationSetting(err.reason);
  });
  const contentTimeBoundariesObserver = new ContentTimeBoundariesObserver(
    manifest,
    streamObserver,
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
