const POSITION_UPDATES_INTERVAL = 100;
const BUFFERED_DATA_UPDATES_INTERVAL = 100;

function addEventListener(eventTarget, event, fn, abortSignal) {
  eventTarget.addEventListener(event, fn);
  abortSignal.addEventListener("abort", () => {
    eventTarget.removeEventListener(event, fn);
  });
}

/**
 * Add event listeners to the RxPlayer to update the module's state at the right
 * time.
 * Unsubscribe when $destroy emit.
 * @param {RxPlayer} player
 * @param {Object} state
 * @param {AbortSignal} abortSignal
 */
const linkPlayerEventsToState = (player, state, abortSignal) => {
  const linkPlayerEventToState = (event, stateItem) => {
    addEventListener(player, event, (payload) => {
      state.set({ [stateItem]: payload });
    }, abortSignal);
  };

  linkPlayerEventToState("textTrackChange", "subtitle");
  linkPlayerEventToState("audioTrackChange", "language");
  linkPlayerEventToState("videoTrackChange", "videoTrack");
  linkPlayerEventToState("videoBitrateChange", "videoBitrate");
  linkPlayerEventToState("audioBitrateChange", "audioBitrate");
  linkPlayerEventToState("error", "error");
  linkPlayerEventToState("volumeChange", "volume");
  linkPlayerEventToState("availableAudioTracksChange", "availableLanguages");
  linkPlayerEventToState("availableVideoTracksChange", "availableVideoTracks");
  linkPlayerEventToState("availableTextTracksChange", "availableSubtitles");
  linkPlayerEventToState("availableAudioBitratesChange", "availableAudioBitrates");
  linkPlayerEventToState("availableVideoBitratesChange", "availableVideoBitrates");

  addEventListener(player, "imageTrackUpdate", ({ data }) => {
    state.set({ images: data });
  }, abortSignal);

  // use an interval for current position
  // TODO Only active for content playback
  const intervalId = setInterval(() => {
    if (player.getPlayerState() === "STOPPED") {
      return;
    }
    const position = player.getPosition();
    const duration = player.getVideoDuration();
    const videoTrack = player.getVideoTrack();
    state.set({
      currentTime: player.getPosition(),
      wallClockDiff: player.getWallClockTime() - position,
      bufferGap: player.getVideoLoadedTime() - player.getVideoPlayedTime(),
      duration: Number.isNaN(duration) ? undefined : duration,
      minimumPosition: player.getMinimumPosition(),
      maximumPosition: player.getMaximumPosition(),
      liveGap: player.getMaximumPosition() - player.getPosition(),
      playbackPosition: player.getPlaybackRate(),
      videoTrackHasTrickMode: videoTrack !== null &&
        videoTrack !== undefined &&
        videoTrack.trickModeTracks !== undefined &&
        videoTrack.trickModeTracks.length > 0,
    });
  }, POSITION_UPDATES_INTERVAL);
  abortSignal.addEventListener("abort", () => {
    clearInterval(intervalId);
  });

  addEventListener(player, "playerStateChange", (playerState) => {
    const stateUpdates = {
      cannotLoadMetadata: false,
      hasEnded: playerState === "ENDED",
      hasCurrentContent: !["STOPPED", "LOADING"].includes(playerState),
      isContentLoaded: !["STOPPED", "LOADING", "RELOADING"].includes(playerState),
      isBuffering: playerState === "BUFFERING",
      isLoading: playerState === "LOADING",
      isReloading: playerState === "RELOADING",
      isSeeking: playerState === "SEEKING",
      isStopped: playerState === "STOPPED",
    };

    switch (playerState) {
      case "ENDED":
        stateUpdates.autoPlayBlocked = false;
        stateUpdates.isPaused = true;
        break;
      case "PAUSED":
        stateUpdates.isPaused = true;
        break;
      case "PLAYING":
        stateUpdates.autoPlayBlocked = false;
        stateUpdates.isPaused = false;
        break;
      case "LOADED":
        stateUpdates.isPaused = true;
        stateUpdates.isLive = player.isLive();
        break;
      case "STOPPED":
        stateUpdates.audioBitrate = undefined;
        stateUpdates.autoPlayBlocked = false;
        stateUpdates.videoBitrate = undefined;
        stateUpdates.availableAudioBitrates = [];
        stateUpdates.availableVideoBitrates = [];
        stateUpdates.availableVideoTracks = [];
        stateUpdates.availableLanguages = [];
        stateUpdates.availableSubtitles = [];
        stateUpdates.lowLatencyMode = false;
        stateUpdates.images = [];
        stateUpdates.subtitle = null;
        stateUpdates.language = null;
        stateUpdates.videoTrack = null;
        stateUpdates.currentTime = undefined;
        stateUpdates.wallClockDiff = undefined;
        stateUpdates.bufferGap = 0;
        stateUpdates.bufferedData = null;
        stateUpdates.duration = undefined;
        stateUpdates.minimumPosition = undefined;
        stateUpdates.maximumPosition = undefined;
        break;
    }

    if (playerState !== "STOPPED") {
      // error is never cleaned up
      stateUpdates.error = null;
    }

    state.set(stateUpdates);
  }, abortSignal);

  const updateBufferedData = () => {
    if (player.getPlayerState === "STOPPED") {
      return;
    }
    let audioContent = player.__priv_getSegmentBufferContent("audio");
    if (Array.isArray(audioContent)) {
      audioContent = audioContent.slice();
    }
    let textContent = player.__priv_getSegmentBufferContent("text");
    if (Array.isArray(textContent)) {
      textContent = textContent.slice();
    }
    let videoContent = player.__priv_getSegmentBufferContent("video");
    if (Array.isArray(videoContent)) {
      videoContent = videoContent.slice();
    }
    state.set({ bufferedData: { audio: audioContent,
                                video: videoContent,
                                text: textContent } });
  };

  const bufferedDataItv = setInterval(
    updateBufferedData,
    BUFFERED_DATA_UPDATES_INTERVAL
  );
  updateBufferedData();
  abortSignal.addEventListener("abort", () => {
    clearInterval(bufferedDataItv);
  });

  addEventListener(player, "warning", (warning) => {
    switch (warning.code) {
      case "MEDIA_ERR_NOT_LOADED_METADATA":
        state.set({ cannotLoadMetadata: true });
        break;
      case "MEDIA_ERR_BLOCKED_AUTOPLAY":
        state.set({ autoPlayBlocked: true });
        break;
    }
  }, abortSignal);
};

export {
  linkPlayerEventsToState,
};
