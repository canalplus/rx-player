import {
  distinctUntilChanged,
  EMPTY,
  interval,
  map,
  of as observableOf,
  startWith,
  switchMap,
} from "rxjs";
import fromPlayerEvent from "./fromPlayerEvent";

// Distance from live edge we try to reach when the catching up button
// is enabled.
const LIVE_GAP_GOAL_WHEN_CATCHING_UP = 3;

// Distance from live edge from which we begin to update the playback rate, as
// we're considered too far from the live edge.
const CATCH_UP_CHANGE_RATE_STEP = 6;

// Distance from live edge from which we are considered too far too just
// change the playback rate. In the case the current distance is superior
// to that value, we will seek to a LIVE_GAP_GOAL_WHEN_CATCHING_UP distance
// directly instead.
const CATCH_UP_SEEKING_STEP = 15;

// Maximum playback rate we can set when catching up.
const MAX_RATE = 10;

/**
 * Perform actions when catch-up mode is enabled/disabled.
 *
 * When it is disabled:
 *   - Reset the playback rate if it was catching up
 *   - Disable catching up mode every time it is found to be enabled
 *
 * When it is enabled:
 *   - seek back to live if it is too far from it.
 *   - Update playback rate and `isCatchingUp` if it is far from the live edge
 *     but not enough too trigger the seek
 */
export default function $handleCatchUpMode(
  $switchCatchUpMode,
  rxPlayer,
  state
) {
  let isCatchingUp = false;

  function stopCatchingUp() {
    if (!isCatchingUp) {
      return EMPTY;
    }
    rxPlayer.setPlaybackRate(1);
    isCatchingUp = false;
    state.set({ isCatchingUp, playbackRate: 1 });
    return observableOf(false);
  }

  return $switchCatchUpMode.pipe(switchMap((isCatchUpEnabled) => {
    return fromPlayerEvent(rxPlayer, "playerStateChange").pipe(
      startWith(rxPlayer.getPlayerState()),
      distinctUntilChanged(),
      map((playerState) => {
        return playerState === "LOADED" ||
               playerState === "PLAYING" ||
               playerState === "PAUSED" ||
               playerState === "BUFFERING" ||
               playerState === "SEEKING";
      }),
      switchMap(canCatchUp => {
        if (!rxPlayer.isLive()) {
          state.set({ isCatchUpEnabled: false });
          return stopCatchingUp();
        }
        state.set({ isCatchUpEnabled });

        if (!isCatchUpEnabled || !canCatchUp) {
          return stopCatchingUp();
        }

        return interval(200).pipe(
          startWith(0),
          map(() => [ rxPlayer.getMaximumPosition(), rxPlayer.getPosition() ]),
          switchMap(([maximumPosition, position]) => {
            const liveGap = maximumPosition - position;
            if (liveGap >= CATCH_UP_SEEKING_STEP) {
              rxPlayer.seekTo(maximumPosition - LIVE_GAP_GOAL_WHEN_CATCHING_UP);
              return stopCatchingUp();
            }

            if (isCatchingUp) {
              if (liveGap <= LIVE_GAP_GOAL_WHEN_CATCHING_UP) {
                return stopCatchingUp();
              }
            } else if (liveGap < CATCH_UP_CHANGE_RATE_STEP) {
              return stopCatchingUp();
            }

            const factor = (liveGap - LIVE_GAP_GOAL_WHEN_CATCHING_UP) / 4;
            const rate = Math.round(Math.min(MAX_RATE, 1.1 + factor) * 10) / 10;
            if (rate <= 1) {
              return stopCatchingUp();
            }

            if (!isCatchingUp) {
              isCatchingUp = true;
              state.set({ isCatchingUp: true });
            }

            state.set({ playbackRate: rate });
            const currentPlaybackRate = rxPlayer.getPlaybackRate();
            if (rate !== currentPlaybackRate) {
              rxPlayer.setPlaybackRate(rate);
            }
            return observableOf(true);
          }));
      }));
  }));
}
