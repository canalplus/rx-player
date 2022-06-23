/**
 * # Player Module
 *
 * Instanciate a new RxPlayer, link its state and this module's state, provide
 * actions to allow easy interactions with the player to the rest of the
 * application.
 */

import {
  Subject,
  takeUntil,
} from "rxjs";
import {
  DASH,
  DIRECTFILE,
  EME,
  HTML_SAMI_PARSER,
  HTML_SRT_PARSER,
  HTML_TEXT_BUFFER,
  HTML_TTML_PARSER,
  HTML_VTT_PARSER,
  SMOOTH,
} from "../../../../../src/features/list";
import {
  DASH_WASM,
  METAPLAYLIST,
} from "../../../../../src/experimental/features";
import RxPlayer from "../../../../../src/minimal.ts";
import { linkPlayerEventsToState } from "./events.js";
import $handleCatchUpMode from "./catchUp";
import VideoThumbnailLoader, {
  DASH_LOADER
} from "../../../../../src/experimental/tools/VideoThumbnailLoader";

RxPlayer.addFeatures([
  DASH,
  DIRECTFILE,
  EME,
  HTML_SAMI_PARSER,
  HTML_SRT_PARSER,
  HTML_TEXT_BUFFER,
  HTML_TTML_PARSER,
  HTML_VTT_PARSER,
  SMOOTH,
  METAPLAYLIST,
]);

/* eslint-disable no-undef */
if (__INCLUDE_WASM_PARSER__) {
/* eslint-enable no-undef */

  RxPlayer.addFeatures([DASH_WASM]);
  DASH_WASM.initialize({ wasmUrl: "./mpd-parser.wasm" });
}

VideoThumbnailLoader.addLoader(DASH_LOADER);

const PLAYER = ({ $destroy, state }, initOpts) => {
  const { textTrackElement } = initOpts;
  const player = new RxPlayer(initOpts);

  // facilitate DEV mode
  window.RxPlayer = RxPlayer;
  window.player = window.rxPlayer = player;

  // initial state. Written here to easily showcase it exhaustively
  state.set({
    audioRepresentation: null,
    audioRepresentationsLocked: false,
    autoPlayBlocked: false,
    availableAudioTracks: [],
    availableSubtitles: [],
    availableVideoTracks: [],
    bufferGap: undefined,
    bufferedData: null,
    cannotLoadMetadata: false,
    currentTime: undefined,
    duration: undefined,
    error: null,
    hasCurrentContent: false,
    hasEnded: false,
    isBuffering: false,
    isCatchUpEnabled: false,
    isCatchingUp: false,
    isContentLoaded: false,
    isLive: false,
    isLoading: false,
    isPaused: false,
    isReloading: false,
    isSeeking: false,
    isStopped: true,
    audioTrack: undefined,
    liveGap: undefined,
    loadedVideo: null,
    lowLatencyMode: false,
    maximumPosition: undefined,
    minimumPosition: undefined,
    playbackRate: player.getPlaybackRate(),
    subtitle: undefined,
    videoRepresentation: undefined,
    videoRepresentationsLocked: false,
    videoTrack: undefined,
    volume: player.getVolume(),
    wallClockDiff: undefined,
    /**
     * If `true`, the currently set video track has a linked "trickmode" track.
     * @type {boolean}
     */
    videoTrackHasTrickMode: false,
    /**
     * Either `null` when no VideoThumbnailLoader is instanciated.
     * Either an object containing two property:
     *   - `videoThumbnailLoader`: The VideoThumbnailLoader instance
     *   - `videoElement`: The video element on which thumbnails are displayed
     * @type {Object|null}
     */
    videoThumbnailsData: null,
  });

  linkPlayerEventsToState(player, state, $destroy);

  const $switchCatchUpMode = new Subject();
  $handleCatchUpMode($switchCatchUpMode, player, state)
    .pipe(takeUntil($destroy))
    .subscribe();

  // dispose of the RxPlayer when destroyed
  $destroy.subscribe(() => player.dispose());

  function dettachVideoThumbnailLoader() {
    const { videoThumbnailsData } = state.get();
    if (videoThumbnailsData !== null) {
      videoThumbnailsData.videoThumbnailLoader.dispose();
      state.set({ videoThumbnailsData: null });
    }
  }
  return {
    ATTACH_VIDEO_THUMBNAIL_LOADER: () => {
      const prevVideoThumbnailsData = state.get().videoThumbnailsData;
      if (prevVideoThumbnailsData !== null) {
        prevVideoThumbnailsData.videoThumbnailLoader.dispose();
      }

      const thumbnailVideoElement = document.createElement("video");
      const videoThumbnailLoader = new VideoThumbnailLoader(
        thumbnailVideoElement,
        player
      );
      state.set({
        videoThumbnailsData: {
          videoThumbnailLoader,
          videoElement: thumbnailVideoElement,
        },
      });
    },

    SET_VOLUME: (volume) => {
      player.setVolume(volume);
    },

    LOAD: (arg) => {
      dettachVideoThumbnailLoader();
      player.loadVideo(Object.assign({
        textTrackElement,
        transportOptions: { checkMediaSegmentIntegrity: true },
      }, arg));
      state.set({
        loadedVideo: arg,
        lowLatencyMode: arg.lowLatencyMode === true,
      });
    },

    PLAY: () => {
      player.play();

      const { isStopped, hasEnded } = state.get();
      if (!isStopped && !hasEnded) {
        state.set({ isPaused: false });
      }
    },

    PAUSE: () => {
      player.pause();

      const { isStopped, hasEnded } = state.get();
      if (!isStopped && !hasEnded) {
        state.set({ isPaused: true });
      }
    },

    STOP: () => {
      dettachVideoThumbnailLoader();
      player.stop();
    },

    SEEK: (position) => {
      player.seekTo({ position });
    },

    MUTE: () => {
      player.mute();
    },

    UNMUTE: () => {
      player.unMute();
    },

    LOCK_VIDEO_REPRESENTATIONS: (reps) => {
      player.lockVideoRepresentations({
        representations: reps.map(r => r.id),
        switchingMode: "reload",
      });
      state.set({
        videoRepresentationsLocked:
          player.getLockedVideoRepresentations() !== null
      });
    },

    UNLOCK_VIDEO_REPRESENTATIONS: () => {
      player.unlockVideoRepresentations();
      state.set({
        videoRepresentationsLocked:
          player.getLockedVideoRepresentations() !== null,
      });
    },

    LOCK_AUDIO_REPRESENTATIONS: (reps) => {
      player.lockAudioRepresentations({
        representations: reps.map(r => r.id),
        switchingMode: "reload",
      });
      state.set({
        audioRepresentationsLocked:
          player.getLockedAudioRepresentations() !== null,
      });
    },

    UNLOCK_AUDIO_REPRESENTATIONS: () => {
      player.unlockAudioRepresentations();
      state.set({
        audioRepresentationsLocked:
          player.getLockedAudioRepresentations() !== null,
      });
    },

    SET_AUDIO_TRACK: (track) => {
      player.setAudioTrack(track.id);
    },

    SET_VIDEO_TRACK: (track) => {
      player.setVideoTrack(track.id);
    },

    DISABLE_VIDEO_TRACK: () => {
      player.disableVideoTrack();
    },

    SET_SUBTITLES_TRACK: (track) => {
      player.setTextTrack(track.id);
    },

    DISABLE_SUBTITLES_TRACK: () => {
      player.disableTextTrack();
    },

    SET_PLAYBACK_RATE: (rate) => {
      player.setPlaybackRate(rate);
      state.set({ playbackRate: rate });
    },

    ENABLE_LIVE_CATCH_UP() {
      $switchCatchUpMode.next(true);
    },

    DISABLE_LIVE_CATCH_UP() {
      $switchCatchUpMode.next(false);
    },
  };
};

export default PLAYER;
