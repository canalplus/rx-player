import {
  interval as intervalObservable,
  Observable,
} from "rxjs";
import {
  takeUntil,
  distinctUntilChanged,
  map,
} from "rxjs/operators";

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
    new Observable(obs => {
      const func = (payload) => obs.next(payload);
      player.addEventListener(event, func);

      return () => {
        player.removeEventListener(event, func);
      };
    });

  const linkPlayerEventToState = (event, stateItem) =>
    fromPlayerEvent(event)
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


  fromPlayerEvent("imageTrackUpdate").pipe(
    distinctUntilChanged(),
    takeUntil($destroy),
    map(({ data }) => data)
  ).subscribe(images => state.set({ images }));

  // use an interval for current position
  // TODO Only active for content playback
  intervalObservable(POSITION_UPDATES_INTERVAL).pipe(
    map(() => {
      const position = player.getPosition();
      return {
        currentTime: player.getPosition(),
        wallClockDiff: player.getWallClockTime() - position,
        bufferGap: player.getVideoLoadedTime() - player.getVideoPlayedTime(),
        duration: player.getVideoDuration(),
        minimumPosition: player.getMinimumPosition(),
        maximumPosition: player.getMaximumPosition(),
      };
    }),
    takeUntil($destroy)
  ).subscribe(arg => {
    state.set(arg);
  });

  fromPlayerEvent("playerStateChange").pipe(
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

    if (arg === "ENDED" || arg === "PAUSED") {
      stateUpdates.isPaused = true;
    } else if (arg === "PLAYING") {
      stateUpdates.isPaused = false;
    } else if (arg === "LOADED") {
      stateUpdates.isPaused = true;
      stateUpdates.isLive = player.isLive();
    } else if (arg === "STOPPED") {
      stateUpdates.audioBitrate = undefined;
      stateUpdates.videoBitrate = undefined;
      stateUpdates.availableAudioBitrates = [];
      stateUpdates.availableVideoBitrates = [];
      stateUpdates.availableVideoTracks = [];
      stateUpdates.availableLanguages = [];
      stateUpdates.availableSubtitles = [];
      stateUpdates.images = [];
      stateUpdates.subtitle = null;
      stateUpdates.language = null;
      stateUpdates.videoTrack = null;
      stateUpdates.currentTime = undefined;
      stateUpdates.wallClockDiff = undefined;
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

  fromPlayerEvent("warning").pipe(
    takeUntil($destroy)
  ).subscribe(warning => {
    if (warning && warning.code === "MEDIA_ERR_NOT_LOADED_METADATA") {
      state.set({ cannotLoadMetadata: true });
    }
  });
};

export {
  linkPlayerEventsToState,
};
