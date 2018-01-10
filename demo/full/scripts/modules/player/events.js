import { Observable } from "rxjs/Observable";

const POSITION_UPDATES_INTERVAL = 100;

/**
 * Add event listeners to the RxPlayer to update the module's state at the right
 * time.
 * Unsubscribe when $destroy emit.
 * @param {RxPlayer} player
 * @param {Subject} state
 * @param {Subject} $destroy
 */
const linkPlayerEventsToState = (player, state, $destroy) => {
  const fromPlayerEvent = (event) =>
    Observable.create(obs => {
      const func = (payload) => obs.next(payload);
      player.addEventListener(event, func);

      return () => {
        player.removeEventListener(event, func);
      };
    });

  const linkPlayerEventToState = (event, stateItem) =>
    fromPlayerEvent(event)
      .takeUntil($destroy)
      .subscribe(arg => state.set({ [stateItem]: arg }));

  linkPlayerEventToState("textTrackChange", "subtitle");
  linkPlayerEventToState("audioTrackChange", "language");
  linkPlayerEventToState("videoBitrateChange", "videoBitrate");
  linkPlayerEventToState("audioBitrateChange", "audioBitrate");
  linkPlayerEventToState("error", "error");
  linkPlayerEventToState("fullscreenChange", "isFullscreen");
  linkPlayerEventToState("volumeChange", "volume");

  fromPlayerEvent("imageTrackUpdate")
    .distinctUntilChanged()
    .takeUntil($destroy)
    .map(({ data }) => data)
    .subscribe(images => state.set({ images }));

  // use an interval for current position
  // TODO Only active for content playback
  Observable
    .interval(POSITION_UPDATES_INTERVAL)
    .map(() => ({
      currentTime: player.getPosition(),
      bufferGap: player.getVideoLoadedTime() - player.getVideoPlayedTime(),
      duration: player.getVideoDuration(),
      minimumPosition: player.getMinimumPosition(),
      maximumPosition: player.getMaximumPosition(),
    }))
    .takeUntil($destroy)
    .subscribe(arg => {
      state.set(arg);
    });

  fromPlayerEvent("playerStateChange")
    .distinctUntilChanged()
    .takeUntil($destroy)
    .subscribe((arg) => {
      const stateUpdates = {
        hasEnded: arg === "ENDED",
        hasLoadedContent: !["STOPPED", "LOADING"].includes(arg),
        isBuffering: arg === "BUFFERING",
        isLoading: arg === "LOADING",
        isSeeking: arg === "SEEKING",
        isStopped: arg === "STOPPED",
        speed: arg === "PLAYING" ? player.getPlaybackRate() : 0,
      };

      if (arg === "PAUSED") {
        stateUpdates.isPaused = true;
      } else if (arg === "PLAYING") {
        stateUpdates.isPaused = false;
      } else if (arg === "LOADED") {
        stateUpdates.isPaused = true;
      } else if (arg === "STOPPED" || arg === "ENDED") {
        stateUpdates.audioBitrate = undefined;
        stateUpdates.videoBitrate = undefined;
        stateUpdates.availableAudioBitrates = [];
        stateUpdates.availableVideoBitrates = [];
        stateUpdates.availableLanguages = [];
        stateUpdates.availableSubtitles = [];
        stateUpdates.images = [];
        stateUpdates.currentTime = undefined;
        stateUpdates.bufferGap = undefined;
        stateUpdates.duration = undefined;
        stateUpdates.minimumPosition = undefined;
        stateUpdates.maximumPosition = undefined;
      }

      if (arg !== "STOPPED") {
        // error is never cleaned up
        stateUpdates.error = null;
      }

      state.set(stateUpdates);
    });

  fromPlayerEvent("periodChange")
    .takeUntil($destroy)
    .subscribe(() => {
      state.set({
        availableAudioBitrates: player.getAvailableAudioBitrates(),
        availableVideoBitrates: player.getAvailableVideoBitrates(),
        availableLanguages: player.getAvailableAudioTracks(),
        availableSubtitles: player.getAvailableTextTracks(),
      });
    });

  fromPlayerEvent("manifestChange")
    .map(() => player.isLive())
    .distinctUntilChanged()
    .takeUntil($destroy)
    .subscribe((isLive) => {
      state.set({ isLive });
    });
};

export {
  linkPlayerEventsToState,
};
