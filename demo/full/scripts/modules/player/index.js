/**
 * # Player Module
 *
 * Instanciate a new RxPlayer, link its state and this module's state, provide
 * actions to allow easy interactions with the player to the rest of the
 * application.
 */

import RxPlayer from "rx-player";
import { linkPlayerEventsToState } from "./events.js";
import { Subject } from "rxjs";
import { takeUntil } from "rxjs/operators";
import $handleCatchUpMode from "./catchUp";
import VideoThumbnailLoader, {
  DASH_LOADER
} from "../../../../../src/experimental/tools/VideoThumbnailLoader";

const PLAYER = ({ $destroy, state }, { videoElement, textTrackElement }) => {
  const player = new RxPlayer({
    limitVideoWidth: false,
    stopAtEnd: false,
    throttleVideoBitrateWhenHidden: true,
    videoElement,
  });

  // facilitate DEV mode
  window.RxPlayer = RxPlayer;
  window.player = window.rxPlayer = player;

  // initial state. Written here to easily showcase it exhaustively
  state.set({
    audioBitrate: undefined,
    audioBitrateAuto: true,
    autoPlayBlocked: false,
    availableAudioBitrates: [],
    availableLanguages: [],
    availableSubtitles: [],
    availableVideoBitrates: [],
    availableVideoTracks: [],
    bufferGap: undefined,
    bufferedData: null,
    cannotLoadMetadata: false,
    currentTime: undefined,
    duration: undefined,
    error: null,
    hasCurrentContent: false,
    hasEnded: false,
    images: [],
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
    language: undefined,
    liveGap: undefined,
    loadedVideo: null,
    lowLatencyMode: false,
    maximumPosition: undefined,
    minimumPosition: undefined,
    playbackRate: player.getPlaybackRate(),
    subtitle: undefined,
    videoBitrate: undefined,
    videoBitrateAuto: true,
    videoTrackId: undefined,
    volume: player.getVolume(),
    wallClockDiff: undefined,
    manifest: undefined,
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
      videoThumbnailLoader.addLoader(DASH_LOADER);
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
        networkConfig: {
          segmentRetry: Infinity,
          manifestRetry: Infinity,
          offlineRetry: Infinity,
        },
        manualBitrateSwitchingMode: "direct",
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

    SET_AUDIO_BITRATE: (bitrate) => {
      player.setAudioBitrate(bitrate || -1);
      state.set({ audioBitrateAuto: !bitrate });
    },

    SET_VIDEO_BITRATE: (bitrate) => {
      player.setVideoBitrate(bitrate || -1);
      state.set({ videoBitrateAuto: !bitrate });
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
