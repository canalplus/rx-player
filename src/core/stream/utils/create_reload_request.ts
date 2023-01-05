import nextTick from "next-tick";
import { CancellationSignal } from "../../../utils/task_canceller";
import { IReadOnlyPlaybackObserver } from "../../api";
import { IPausedPlaybackObservation } from "../adaptation";
import { IPositionPlaybackObservation } from "../representation";

/**
 * Function to facilitate the task of asking for the MediaSource to be reloaded.
 *
 * @param {Object} playbackObserver - Regularly emits the current playback
 * conditions.
 * @param {Function} fn - Function that will be called regularly with the
 * position and auto-play status that you should ask to reload to.
 * @param {number} deltaPos - This value, in seconds, will be added to the
 * actual current position (respecting the `timeBounds` given) to indicate the
 * position we should reload at.
 * This value allows to give back context (by replaying some media data) after
 * a switch.
 * @param {Object} timeBounds - Bounds that should not be exceeded on the
 * position to reload to. Both `start` and `end` bounds can be set to
 * `undefined` to disable them.
 * @param {Object} cancelSignal - When it emits, we stop asking for the
 * MediaSource to be reloaded.
 */
export default function createReloadRequest (
  playbackObserver : IReadOnlyPlaybackObserver<{
    position : IPositionPlaybackObservation;
    paused : IPausedPlaybackObservation;
  }>,
  fn : (arg : { position : number; autoPlay : boolean }) => void,
  deltaPos : number,
  timeBounds : { start : number | undefined; end : number | undefined },
  cancelSignal : CancellationSignal
) : void {
  if (cancelSignal.isCancelled) {
    return;
  }

  // We begin by scheduling a micro-task to reduce the possibility of race
  // conditions.
  //
  // For example `createReloadRequest` could be called synchronously
  // before the next observation (which may reflect very different
  // playback conditions) is actually received. This can happen when
  // `createReloadRequest` is called as a side-effect of the same event
  // that triggers the playback observation to be emitted. In that situation,
  // scheduling a micro task ensures that the true last observation is
  // considered.
  //
  // Other races conditions could also happen for when example multiple
  // modules of the player handle some events (I can think for example of the
  // case where the `Adaptation` disappears on a Manifest update) where we
  // want the reloading operation to be a last resort situation, so we prefer
  // to postpone it after other potential synchronous solutions from other
  // modules have been tested.
  //
  // At last, because reloading is such an aggressive situation, we prefer to
  // trigger it always asynchronously so behavior is better predictible.
  nextTick(() => {
    playbackObserver.listen((observation) => {
      const currentTime = playbackObserver.getCurrentTime();
      let position = currentTime + deltaPos;
      position = Math.min(Math.max(timeBounds.start ?? 0, position),
                          timeBounds.end ?? Infinity);
      const autoPlay = !(observation.paused.pending ?? playbackObserver.getIsPaused());
      fn({ position, autoPlay });
    }, { includeLastObservation: true, clearSignal: cancelSignal });
  });
}
