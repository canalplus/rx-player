const { Observable } = require("rxjs");

const POSITION_UPDATES_INTERVAL = 100;

/**
 * Add event listeners to the RxPlayer to update the module's state at the right
 * time.
 * Unsubscribe when $destroy emit.
 * @param {RxPlayer} player
 * @param {Subject} $state
 * @param {Subject} $destroy
 */
const linkPlayerEventsToState = (player, $state, $destroy) => {
  const fromPlayerEvent = (event) =>
    Observable.create(obs => {
      const func = (payload) => obs.next(payload);
      player.addEventListener(event, func);

      return () => {
        player.removeEventListener(event, func);
      };
    });

  const linkPlayerEventToState = (event, state) =>
    fromPlayerEvent(event)
      .takeUntil($destroy)
      .subscribe(arg => $state.next({ [state]: arg }));

  linkPlayerEventToState("subtitleChange", "subtitle");
  linkPlayerEventToState("languageChange", "language");
  linkPlayerEventToState("videoBitrateChange", "videoBitrate");
  linkPlayerEventToState("audioBitrateChange", "audioBitrate");
  linkPlayerEventToState("error", "error");
  linkPlayerEventToState("fullscreenChange", "isFullscreen");
  linkPlayerEventToState("volumeChange", "volume");

  player.getImageTrack()
    .takeUntil($destroy)
    .subscribe(images => $state.next({ images }));

  // use an interval for current position
  // TODO Only active for content playback
  Observable
    .interval(POSITION_UPDATES_INTERVAL)
    .map(() => ({
      currentTime: player.getCurrentTime(),
      bufferGap: player.getVideoLoadedTime() - player.getVideoPlayedTime(),
      duration: player.getVideoDuration(),
    }))
    .takeUntil($destroy)
    .subscribe(arg => {
      $state.next(arg);
    });

  fromPlayerEvent("playerStateChange")
    .distinctUntilChanged()
    .takeUntil($destroy)
    .subscribe((state) => {
      const stateUpdates = {
        hasEnded: state === "ENDED",
        hasLoadedContent: !["STOPPED", "LOADING"].includes(state),
        isBuffering: state === "BUFFERING",
        isLoading: state === "LOADING",
        isSeeking: state === "SEEKING",
        isStopped: state === "STOPPED",
        speed: state === "PLAYING" ? player.getPlaybackRate() : 0,
      };

      if (state === "PAUSED") {
        stateUpdates.isPaused = true;
      } else if (state === "PLAYING") {
        stateUpdates.isPaused = false;
      } else if (state === "LOADED") {
        stateUpdates.availableAudioBitrates =
          player.getAvailableAudioBitrates();
        stateUpdates.availableVideoBitrates =
          player.getAvailableVideoBitrates();
        stateUpdates.availableLanguages =
          player.getAvailableLanguages();
        stateUpdates.availableSubtitles =
          player.getAvailableSubtitles();
      } else if (state === "STOPPED" || state === "ENDED") {
        stateUpdates.audioBitrate = undefined;
        stateUpdates.videoBitrate = undefined;
        stateUpdates.availableAudioBitrates = [];
        stateUpdates.availableVideoBitrates = [];
        stateUpdates.availableLanguages = [];
        stateUpdates.availableSubtitles = [];
      }

      if (state !== "STOPPED") {
        // error is never cleaned up
        stateUpdates.error = null;
      }

      $state.next(stateUpdates);
    });

  player.getMetrics()
    .takeUntil($destroy)
    // .map((metric) => metric.value.response)
    // .filter((response) => response.size > 2000)
    .subscribe((metric = {}) => {
      const { response } = metric.value;
      if (response.size > 10000) {
        $state.next({
          bandwidth: (response.size / response.duration) * 0.008, // in mbps
        });
      }
    });

  fromPlayerEvent("manifestChange")
    .map(() => player.isLive())
    .distinctUntilChanged()
    .takeUntil($destroy)
    .subscribe((isLive) => {
      $state.next({ isLive });
    });
};

module.exports = {
  linkPlayerEventsToState,
};
