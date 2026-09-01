import type {
  ISegmentSinksStore,
  IStreamOrchestratorPlaybackObservation,
} from "../../core/types.ts";
import log from "../../log.ts";
import type { IManifest, IPeriod } from "../../manifest/index.ts";
import type { IMediaSourceInterface } from "../../mse/index.ts";
import type { IReadOnlyPlaybackObserver } from "../../playback_observer/index.ts";
import type { IPlayerError } from "../../public_types.ts";
import noop from "../../utils/noop.ts";
import type { CancellationSignal } from "../../utils/task_canceller.ts";
import ContentTimeBoundariesObserver from "./content_time_boundaries_observer.ts";
import type { IEndingPositionInformation } from "./content_time_boundaries_observer.ts";

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
 * @param {Object} streamObserver
 * @param {Object} segmentSinksStore
 * @param {Object} cancelSignal
 * @returns {Object}
 */
export default function createContentTimeBoundariesObserver(
  manifest: IManifest,
  streamObserver: IReadOnlyPlaybackObserver<IStreamOrchestratorPlaybackObservation>,
  segmentSinksStore: ISegmentSinksStore,
  callbacks: IContentTimeBoundariesObserverCallbacks,
  cancelSignal: CancellationSignal,
): ContentTimeBoundariesObserver {
  const contentTimeBoundariesObserver = new ContentTimeBoundariesObserver(
    manifest,
    streamObserver,
    segmentSinksStore.getBufferTypes(),
  );
  let mediaSource: IMediaSourceInterface | null = null;
  let lastEndingPositionInformation: IEndingPositionInformation =
    contentTimeBoundariesObserver.getCurrentEndingTime();
  let isEndOfStream = false;
  segmentSinksStore
    .getMediaSourceInterface(cancelSignal)
    .then((msi) => {
      mediaSource = msi;
      if (isEndOfStream) {
        log.debug("Init", "end-of-stream order received.");
        mediaSource.maintainEndOfStream();
      }
      mediaSource.setDuration(
        lastEndingPositionInformation.endingPosition,
        lastEndingPositionInformation.isEnd,
      );
    })
    .catch(noop);
  cancelSignal.register((err) => {
    if (mediaSource !== null) {
      mediaSource.interruptDurationSetting(err.reason);
    }
  });
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
    lastEndingPositionInformation = evt;
    if (mediaSource !== null) {
      mediaSource.setDuration(evt.endingPosition, evt.isEnd);
    }
  });
  contentTimeBoundariesObserver.addEventListener("endOfStream", () => {
    isEndOfStream = true;
    if (mediaSource !== null) {
      log.debug("mse", "Start applying end-of-stream order.");
      mediaSource.maintainEndOfStream();
    }
  });
  contentTimeBoundariesObserver.addEventListener("resumeStream", () => {
    isEndOfStream = false;
    if (mediaSource !== null) {
      mediaSource.stopEndOfStream();
    }
  });
  return contentTimeBoundariesObserver;
}
