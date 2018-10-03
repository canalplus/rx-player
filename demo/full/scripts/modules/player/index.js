/**
 * # Player Module
 *
 * Instanciate a new RxPlayer, link its state and this module's state, provide
 * actions to allow easy interactions with the player to the rest of the
 * application.
 */

import { linkPlayerEventsToState } from "./events.js";

const RxPlayer = window.RxPlayer;

const PLAYER = ({ $destroy, state }, { videoElement, textTrackElement }) => {
  const player = new RxPlayer({
    limitVideoWidth: false,
    stopAtEnd: false,
    throttleWhenHidden: true,
    videoElement,
  });

  // facilitate DEV mode
  window.player = window.rxPlayer = player;

  // initial state. Written here to easily showcase it exhaustively
  state.set({
    audioBitrateAuto: true,
    audioBitrate: undefined,
    availableAudioBitrates: [],
    availableLanguages: [],
    availableVideoBitrates: [],
    availableVideoTracks: [],
    availableSubtitles: [],
    bufferGap: undefined,
    currentTime: undefined,
    duration: undefined,
    error: null,
    hasEnded: false,
    hasCurrentContent: false,
    images: [],
    isBuffering: false,
    isContentLoaded: false,
    isFullscreen: player.isFullscreen(),
    isLive: false,
    isLoading: false,
    isPaused: false,
    isReloading: false,
    isSeeking: false,
    isStopped: true,
    language: undefined,
    videoTrackId: undefined,
    loadedVideo: null,
    minimumPosition: undefined,
    maximumPosition: undefined,
    playbackRate: player.getPlaybackRate(),
    subtitle: undefined,
    videoBitrateAuto: true,
    videoBitrate: undefined,
    volume: player.getVolume(),
    wallClockDiff: undefined,
  });

  linkPlayerEventsToState(player, state, $destroy);

  // dispose of the RxPlayer when destroyed
  $destroy.subscribe(() => player.dispose());

  return {
    SET_VOLUME: (volume) => {
      player.setVolume(volume);
    },

    LOAD: (arg) => {
      player.loadVideo(Object.assign({
        textTrackElement,
        networkConfig: {
          segmentRetry: Infinity,
          manifestRetry: Infinity,
          offlineRetry: Infinity,
        },
        manualBitrateSwitchingMode: "direct",
      }, arg));
      state.set({ loadedVideo: arg });
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

    SET_FULL_SCREEN: () => {
      player.setFullscreen(true);
    },

    EXIT_FULL_SCREEN: () => {
      player.setFullscreen(false);
    },

    SET_AUDIO_BITRATE: (bitrate) => {
      player.setAudioBitrate(bitrate || -1);
      state.set({
        audioBitrateAuto: !bitrate,
      });
    },

    SET_VIDEO_BITRATE: (bitrate) => {
      player.setVideoBitrate(bitrate || -1);
      state.set({
        videoBitrateAuto: !bitrate,
      });
    },

    SET_AUDIO_TRACK: (track) => {
      player.setAudioTrack(track.id);
    },

    SET_VIDEO_TRACK: (track) => {
      player.setVideoTrack(track.id);
    },

    SET_SUBTITLES_TRACK: (track) => {
      player.setTextTrack(track.id);
    },

    DISABLE_SUBTITLES_TRACK: () => {
      player.disableTextTrack();
    },

    SET_PLAYBACK_RATE: (rate) => {
      player.setPlaybackRate(rate);
      state.set({
        playbackRate: rate,
      });
    },
  };
};

export default PLAYER;
