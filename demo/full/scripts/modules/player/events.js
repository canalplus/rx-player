import {
  distinctUntilChanged,
  EMPTY,
  interval as intervalObservable,
  map,
  startWith,
  switchMap,
  takeUntil,
  tap,
} from "rxjs";
import fromPlayerEvent from "./fromPlayerEvent";

const POSITION_UPDATES_INTERVAL = 100;
const BUFFERED_DATA_UPDATES_INTERVAL = 100;

/**
 * Add event listeners to the RxPlayer to update the module's state at the right
 * time.
 * Unsubscribe when $destroy emit.
 * @param {RxPlayer} player
 * @param {Subject} state
 * @param {Subject} $destroy
 */
const linkPlayerEventsToState = (player, state, $destroy) => {
  const linkPlayerEventToState = (event, stateItem) =>
    fromPlayerEvent(player, event)
      .pipe(takeUntil($destroy))
      .subscribe(arg => state.set({ [stateItem]: arg }));

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


  fromPlayerEvent(player, "imageTrackUpdate").pipe(
    distinctUntilChanged(),
    takeUntil($destroy),
    map(({ data }) => data)
  ).subscribe(images => state.set({ images }));

  // use an interval for current position
  // TODO Only active for content playback
  intervalObservable(POSITION_UPDATES_INTERVAL).pipe(
    map(() => {
      const position = player.getPosition();
      const duration = player.getVideoDuration();
      const videoTrack = player.getVideoTrack();
      return {
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
      };
    }),
    takeUntil($destroy)
  ).subscribe(arg => {
    state.set(arg);
  });

  fromPlayerEvent(player, "playerStateChange").pipe(
    distinctUntilChanged(),
    takeUntil($destroy)
  ).subscribe((arg) => {
    const stateUpdates = {
      cannotLoadMetadata: false,
      hasEnded: arg === "ENDED",
      hasCurrentContent: !["STOPPED", "LOADING"].includes(arg),
      isContentLoaded: !["STOPPED", "LOADING", "RELOADING"].includes(arg),
      isBuffering: arg === "BUFFERING",
      isLoading: arg === "LOADING",
      isReloading: arg === "RELOADING",
      isSeeking: arg === "SEEKING",
      isStopped: arg === "STOPPED",
    };

    switch (arg) {
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
        stateUpdates.bufferGap = undefined;
        stateUpdates.bufferedData = null;
        stateUpdates.duration = undefined;
        stateUpdates.minimumPosition = undefined;
        stateUpdates.maximumPosition = undefined;
        break;
    }

    if (arg !== "STOPPED") {
      // error is never cleaned up
      stateUpdates.error = null;
    }

    state.set(stateUpdates);
  });

  // update bufferedData
  fromPlayerEvent(player, "playerStateChange").pipe(
    map((playerState) => playerState === "STOPPED"),
    distinctUntilChanged(),
    takeUntil($destroy),
    switchMap((isStopped) => {
      if (isStopped) {
        state.set({ bufferedData: null });
        return EMPTY;
      }
      return intervalObservable(BUFFERED_DATA_UPDATES_INTERVAL).pipe(
        startWith(0),
        tap(() => {
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
        }));

    })
  ).subscribe();

  fromPlayerEvent(player, "warning").pipe(
    takeUntil($destroy)
  ).subscribe(warning => {
    if (warning === null || warning === undefined) {
      return ;
    }
    switch (warning.code) {
      case "MEDIA_ERR_NOT_LOADED_METADATA":
        state.set({ cannotLoadMetadata: true });
        break;
      case "MEDIA_ERR_BLOCKED_AUTOPLAY":
        state.set({ autoPlayBlocked: true });
        break;
    }
  });
};

export {
  linkPlayerEventsToState,
};
