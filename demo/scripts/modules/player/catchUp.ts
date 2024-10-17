// Distance from live edge we try to reach when the catching up button

import type { IPlayerModuleState } from ".";
import type RxPlayer from "rx-player/minimal";
import type { IStateUpdater } from "../../lib/declareModule";

// is enabled.
const LIVE_GAP_GOAL_WHEN_CATCHING_UP = 3.5;

// Distance from live edge from which we begin to update the playback rate, as
// we're considered too far from the live edge.
const CATCH_UP_CHANGE_RATE_STEP = 6;

// Distance from live edge from which we are considered too far too just
// change the playback rate. In the case the current distance is superior
// to that value, we will seek to a LIVE_GAP_GOAL_WHEN_CATCHING_UP distance
// directly instead.
const CATCH_UP_SEEKING_STEP = 15;

// Maximum playback rate we can set when catching up.
const MAX_RATE = 5;

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
export default class CatchUpModeController {
  private _rxPlayer: RxPlayer;
  private _state: IStateUpdater<IPlayerModuleState>;
  private _catchUpAborter: AbortController | null;

  constructor(rxPlayer: RxPlayer, state: IStateUpdater<IPlayerModuleState>) {
    this._rxPlayer = rxPlayer;
    this._state = state;
    this._catchUpAborter = null;
  }

  enableCatchUp() {
    if (this._catchUpAborter !== null) {
      return;
    }
    this._catchUpAborter = new AbortController();
    let interval: number | null = null;
    const onStateChange = () => {
      if (interval !== null) {
        clearInterval(interval);
        interval = null;
      }
      const playerState = this._rxPlayer.getPlayerState();
      const canCatchUp =
        playerState === "LOADED" ||
        playerState === "PLAYING" ||
        playerState === "PAUSED" ||
        playerState === "BUFFERING" ||
        playerState === "FREEZING" ||
        playerState === "SEEKING";
      if (!this._rxPlayer.isLive()) {
        // Catch-up is only authorized for live contents
        this.stopCatchUp();
      } else if (!canCatchUp) {
        // Stop catching up if the state does not make sense for it
        this._rxPlayer.setPlaybackRate(1);
        this._state.updateBulk({ isCatchingUp: false, playbackRate: 1 });
      } else {
        const checkCatchUp = () => {
          const livePos =
            this._rxPlayer.getLivePosition() ?? this._rxPlayer.getMaximumPosition();
          if (livePos === null) {
            this._rxPlayer.setPlaybackRate(1);
            this._state.updateBulk({ isCatchingUp: false, playbackRate: 1 });
            return;
          }
          const position = this._rxPlayer.getPosition();
          const liveGap = livePos - position;
          if (liveGap >= CATCH_UP_SEEKING_STEP) {
            // If we're too far from the live to just change the playback rate,
            // seek directly close to live
            this._rxPlayer.seekTo(livePos - LIVE_GAP_GOAL_WHEN_CATCHING_UP);
            this._rxPlayer.setPlaybackRate(1);
            this._state.updateBulk({ isCatchingUp: false, playbackRate: 1 });
            return;
          }

          if (this._state.get("isCatchingUp")) {
            if (liveGap <= LIVE_GAP_GOAL_WHEN_CATCHING_UP) {
              // If we reached `LIVE_GAP_GOAL_WHEN_CATCHING_UP`, we can stop
              // catching up
              this._rxPlayer.setPlaybackRate(1);
              this._state.updateBulk({ isCatchingUp: false, playbackRate: 1 });
              return;
            }
          } else if (liveGap < CATCH_UP_CHANGE_RATE_STEP) {
            // Not catching up but we're close enough to the live, so no problem
            // here.
            return;
          }

          // If we reached this point, we need to catch up by modifiying the
          // playback rate. The following code determine by how much

          const factor = (liveGap - LIVE_GAP_GOAL_WHEN_CATCHING_UP) / 4;
          const rate = Math.round(Math.min(MAX_RATE, 1.1 + factor) * 10) / 10;
          if (rate <= 1) {
            this._rxPlayer.setPlaybackRate(1);
            this._state.updateBulk({ isCatchingUp: false, playbackRate: 1 });
            return;
          }

          const currentPlaybackRate = this._rxPlayer.getPlaybackRate();
          if (rate !== currentPlaybackRate) {
            this._rxPlayer.setPlaybackRate(rate);
          }
          this._state.updateBulk({ isCatchingUp: true, playbackRate: rate });
        };
        interval = window.setInterval(checkCatchUp, 200);
        checkCatchUp();

        this._catchUpAborter?.signal.addEventListener("abort", () => {
          if (interval !== null) {
            clearInterval(interval);
            interval = null;
          }
        });
      }
    };
    this._rxPlayer.addEventListener("playerStateChange", onStateChange);

    this._catchUpAborter?.signal.addEventListener("abort", () => {
      this._rxPlayer.removeEventListener("playerStateChange", onStateChange);
    });
  }

  stopCatchUp() {
    if (this._catchUpAborter === null) {
      return;
    }
    this._catchUpAborter.abort();
    this._catchUpAborter = null;
    this._rxPlayer.setPlaybackRate(1);
    this._state.updateBulk({
      isCatchUpEnabled: false,
      isCatchingUp: false,
      playbackRate: 1,
    });
  }
}
