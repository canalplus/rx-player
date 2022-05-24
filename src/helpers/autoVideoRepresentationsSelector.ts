import type RxPlayer from "../main_thread/api";
import {
  IBrokenRepresentationsLockContext,
  IPeriod,
  ITrackUpdateEventPayload,
  IVideoTrack,
} from "../public_types";

/**
 * Helper to automatically "lock" video Representations each time the current
 * video track changes with no already-locked Representations.
 *
 * Calling this helper simplifies the task of preventing to play some
 * Representations which does not respect a given predicate, such as:
 *   - Representations with a too high/low bitrate
 *   - Representations with a too high/low display resolution
 *   - Representations with the wrong codec
 *   - etc.
 *
 * If a chosen video track already has locked Representations, the selector
 * won't be called, as we consider representations locked explicitly
 * application prioritary over those done implicitely by the selector.
 *
 * Note that all the operations this helper perform is by using the RxPlayer
 * API: this helper only registers to the right RxPlayer events and call the
 * right methods.
 * You can directly read and even copy its code if you want to see the action
 * performed.
 *
 * To avoid surprising results, it's better to call this helper before
 * performing most other interactions with the given RxPlayer instance,
 * especially before adding event listeners to it.
 * This is because this helper also listens to RxPlayer events. Registering to
 * the same ones before it, will lead to your listeners being called before the
 * ones from this helper, which may lead to surprising information (such as
 * Representations being not yet locked), though it should be properly handled
 * by the helper in the end.
 *
 * @example
 * ```js
 * const rxPlayer = new RxPlayer({ videoElement });
 *
 * // Auto-locking Representations with a height superior or equal to 720 pixels
 * const audioVideoRepresentationsSelector = createAutoVideoRepresentationSelector(
 *   rxPlayer,
 *   (track) => {
 *     const { representations } = track;
 *     const lockedRepresentationsId = representations
 *       .filter(r => r.height !== undefined && r.height >= 720);
 *
 *     if (lockedRepresentationsId.length > 0) {
 *       return lockedRepresentationsId;
 *     } else {
 *       // No Representation actually has at least 720 pixels in height.
 *       // Just take the one with the highest height.
 *       const highestRepresentation = representations.reduce((acc, r) => {
 *         if (acc === undefined) {
 *           return r;
 *         }
 *         // Note: If there's an equality, we could also return ALL
 *         // Representations with the highest height
 *         return r.height > acc.height ?
 *           r :
 *           acc;
 *       }, undefined);
 *       return highestRepresentation !== undefined ?
 *         [highestRepresentation.id] :
 *         [];
 *     }
 *   }
 * );
 * ```
 *
 * @param {RxPlayer} rxPlayer - The RxPlayer instance on which to apply this
 * selector.
 * @param {Function} selector - The selector function which is going to filter
 * and return the authorized Representations'id from the given track.
 *
 * @returns {Object} - Returns an object with several methods allowing to
 * disable, re-enable, update or completely dispose the selector logic.
 */
export function createAutoVideoRepresentationSelector(
  rxPlayer: RxPlayer,
  selector: IVideoRepresentationSelectorFunction
) : IAutoVideoRepresentationsSelector {
  /**
   * Last selector function set.
   * This variable allows to re-enable it when the selector disabled.
   */
  let lastSelectorMemory : IVideoRepresentationSelectorFunction = selector;

  /** Actual selector function used. `null` when disabled. */
  let _selector : IVideoRepresentationSelectorFunction | null = selector;

  // Save original `setVideoTrack` method for later
  // Note that this is only needed here so we can overwrite the application's
  // own `setVideoTrack` calls.
  //
  // This would not be needed if the locking operation was directly performed
  // by the application (as opposed to performed by this locker), as it would
  // probably directly include its locking logic directly in its own
  // `setVideoTrack` calls.
  /* eslint-disable-next-line @typescript-eslint/unbound-method */
  const oldSetVideoTrack = rxPlayer.setVideoTrack;

  // Apply logic for any future contents and Periods
  rxPlayer.addEventListener("newAvailablePeriods", onAvailablePeriods);

  // If for whatever reasons a lock breaks (e.g. when previous locked
  // Representations are all found to be undecipherable), re-apply
  // the given logic on the new list of Representations.
  rxPlayer.addEventListener("brokenRepresentationsLock", onBrokenLock);

  // If for whatever reason, the video track choice for a Period was
  // "lost" (e.g. we could not find it again after a Manifest refresh), re-run
  // logic.
  // Note that this should rarely if ever happen, this is only here for
  // resilience reasons.
  rxPlayer.addEventListener("trackUpdate", onTrackUpdate);

  /**
   * Patch of the `setVideoTrack` RxPlayer method so that it applies the selector
   * when switching to a new video track.
   */
  rxPlayer.setVideoTrack = function patchedSetVideoTrack(...args) {
    const opts = args[0]; // Recuperate setVideoTrack's options
    if (_selector === null) { // The selector is disabled
      return oldSetVideoTrack.apply(rxPlayer, args);
    }

    let trackId : string | undefined;
    let periodId : string | undefined;
    let lockedRepresentations : string[] | undefined;
    if (typeof opts === "string") {
      trackId = opts; // Argument is a string == only the `trackId` has been set
    } else if (Array.isArray(opts.lockedRepresentations)) {
      // The `setVideoTrack` call already included locked Representations, do
      // not include ours
      return oldSetVideoTrack.call(rxPlayer, opts);
    } else {
      trackId = opts.trackId;
      periodId = opts.periodId;
    }

    let period : IPeriod | undefined;
    if (periodId === undefined) {
      period = rxPlayer.getCurrentPeriod() ?? undefined;
    } else {
      period = rxPlayer.getAvailablePeriods().find(({ id }) => id === periodId);
    }

    const wantedTrack = rxPlayer.getAvailableVideoTracks(periodId)
      .filter(track => track.id === trackId)[0];
    if (wantedTrack !== undefined) {
      lockedRepresentations = _selector(wantedTrack, { period });
    }

    const augmentedOpts = typeof opts === "string" ?
      { trackId, lockedRepresentations } :
      { ...opts, lockedRepresentations };
    args[0] = augmentedOpts;
    return oldSetVideoTrack.apply(rxPlayer, args);
  };

  return {
    disable() {
      _selector = null;
    },
    enable() {
      _selector = lastSelectorMemory;
    },
    update(newSelector: IVideoRepresentationSelectorFunction) {
      lastSelectorMemory = newSelector;
      _selector = newSelector;
    },
    dispose() : void {
      rxPlayer.setVideoTrack = oldSetVideoTrack;
      rxPlayer.removeEventListener("newAvailablePeriods", onAvailablePeriods);
      rxPlayer.removeEventListener("brokenRepresentationsLock", onBrokenLock);
      rxPlayer.removeEventListener("trackUpdate", onTrackUpdate);
    },
  };

  function onBrokenLock(e : IBrokenRepresentationsLockContext) {
    runSelectorForPeriod(e.period);
  }

  function onTrackUpdate(e : ITrackUpdateEventPayload) {
    runSelectorForPeriod(e.period);
  }

  function runSelectorForPeriod(period : IPeriod) {
    if (_selector === null) { // The selector is disabled
      return;
    }
    const newTrack = rxPlayer.getVideoTrack(period.id);
    if (newTrack === undefined || newTrack === null) { // No track chosen, exit
      return;
    }
    if (rxPlayer.getLockedVideoRepresentations(period.id) !== null) {
      // Some Representations are already locked exit
      return;
    }
    const lockedRepresentations = _selector(newTrack, { period });
    rxPlayer.lockVideoRepresentations(lockedRepresentations);
  }

  function onAvailablePeriods() {
    if (_selector === null) { // The selector is disabled
      return;
    }

    // Just for resilience, let's exit this function if the player stops due to a
    // side-effect while running the following code
    let isStopped = rxPlayer.getPlayerState() === "STOPPED";
    const onStateChange = (playerState : string) => {
      isStopped = playerState === "STOPPED";
    };
    rxPlayer.addEventListener("playerStateChange", onStateChange);
    for (const period of rxPlayer.getAvailablePeriods()) {
      if (isStopped || _selector === null) {
        // Exit loop if one of the `lockVideoRepresentations` calls here led to an
        // error, to the playback stopping or even to the disabling of the current
        // selector.
        break;
      }
      const periodId = period.id;

      try {
        const videoTrack = rxPlayer.getVideoTrack(periodId);
        if (
          videoTrack !== null &&
          videoTrack !== undefined &&
          rxPlayer.getLockedVideoRepresentations(periodId) === null
        ) {
          const representations = _selector(videoTrack, { period });
          rxPlayer.lockVideoRepresentations({
            periodId,
            representations,

            // do not remove higher video qualities already in the buffer
            switchingMode: "lazy",
          });
        }
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error(e);
      }
    }
    rxPlayer.removeEventListener("playerStateChange", onStateChange);
  }
}

/**
 * Context given as a second argument to a `IVideoRepresentationSelectorFunction`.
 */
export interface IVideoRepresentationSelectorContext {
  /** Information on the concerned Period. */
  period: IPeriod | undefined;
}

/**
 * Selector function awaited by `createAutoVideoRepresentationSelector`.
 * It takes in argument a chosen video track and some context about it, and
 * should return an array of the wanted Representations' `id` property from
 * that track.
 */
export type IVideoRepresentationSelectorFunction =
  (track: IVideoTrack, context: IVideoRepresentationSelectorContext) => string[];

export interface IAutoVideoRepresentationsSelector {
  /**
   * Temporarly disable the usage of the selector, until either `enable` or
   * `update` is called.
   *
   * Do nothing if no selector is enabled currently (i.e. when `disable` was
   * already called.
   */
  disable() : void;
  /**
   * Re-enable  the usage of the last set selector that has been disabled
   * through a `disable` call.
   *
   * Do nothing if the last selector is not disabled.
   */
  enable() : void;
  /**
   * Change the selector's logic.
   * This takes effect immediately.
   */
  update(newSelector: IVideoRepresentationSelectorFunction) : void;
  /**
   * Dispose of all resources taken by this `IAutoVideoRepresentationsSelector`,
   * as well as disable the Representations-locking logic.
   *
   * The `IAutoVideoRepresentationsSelector` will be unusable after calling this
   * method.
   */
  dispose() : void;
}
