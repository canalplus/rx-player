import log from "../../../log";
import Manifest, {
  Period,
} from "../../../manifest";
import { IMediaSourceInterface } from "../../../mse";
import { IPlayerError } from "../../../public_types";
import {
  CancellationSignal,
} from "../../../utils/task_canceller";
import { IReadOnlyPlaybackObserver } from "../../api";
import SegmentBuffersStore from "../../segment_buffers";
import { IStreamOrchestratorPlaybackObservation } from "../../stream";
import ContentTimeBoundariesObserver from "../utils/content_time_boundaries_observer";

export interface IContentTimeBoundariesObserverCallbacks {
  onWarning: (evt: IPlayerError) => void;
  onPeriodChanged: (period: Period) => void;
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
 * @param {Object} segmentBuffersStore
 * @param {Object} cancelSignal
 * @returns {Object}
 */
export default function createContentTimeBoundariesObserver(
  manifest : Manifest,
  mediaSource : IMediaSourceInterface,
  streamObserver : IReadOnlyPlaybackObserver<IStreamOrchestratorPlaybackObservation>,
  segmentBuffersStore : SegmentBuffersStore,
  callbacks: IContentTimeBoundariesObserverCallbacks,
  cancelSignal : CancellationSignal
) : ContentTimeBoundariesObserver {
  cancelSignal.register(() => {
    mediaSource.interruptDurationSetting();
  });
  const contentTimeBoundariesObserver = new ContentTimeBoundariesObserver(
    manifest,
    streamObserver,
    segmentBuffersStore.getBufferTypes()
  );
  cancelSignal.register(() => {
    contentTimeBoundariesObserver.dispose();
  });
  contentTimeBoundariesObserver.addEventListener("warning", (err) =>
    callbacks.onWarning(err));
  contentTimeBoundariesObserver.addEventListener("periodChange", (period) =>
    callbacks.onPeriodChanged(period));
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
