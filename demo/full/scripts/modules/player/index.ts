/**
 * # Player Module
 *
 * Instanciate a new RxPlayer, link its state and this module's state, provide
 * actions to allow easy interactions with the player to the rest of the
 * application.
 */

import {
  BIF_PARSER,
  DASH,
  DIRECTFILE,
  EME,
  HTML_SAMI_PARSER,
  HTML_SRT_PARSER,
  HTML_TEXT_BUFFER,
  HTML_TTML_PARSER,
  HTML_VTT_PARSER,
  IMAGE_BUFFER,
  SMOOTH,
} from "../../../../../src/features/list";
import {
  DASH_WASM,
  METAPLAYLIST,
  DEBUG_ELEMENT,
} from "../../../../../src/experimental/features";
import RxPlayer from "../../../../../src/minimal";
import { linkPlayerEventsToState } from "./events";
import VideoThumbnailLoader, {
  DASH_LOADER,
} from "../../../../../src/experimental/tools/VideoThumbnailLoader";
import CatchUpModeController from "./catchUp";
import { declareModule } from "../../lib/declareModule";
import type {
  IAdaptation,
  IAudioTrack,
  IAvailableAudioTrack,
  IAvailableTextTrack,
  IAvailableVideoTrack,
  IConstructorOptions,
  ILoadVideoOptions,
  IRepresentation,
  ITextTrack,
  IVideoTrack,
} from "../../../../../src/public_types";

RxPlayer.addFeatures([
  BIF_PARSER,
  DASH,
  DIRECTFILE,
  EME,
  HTML_SAMI_PARSER,
  HTML_SRT_PARSER,
  HTML_TEXT_BUFFER,
  HTML_TTML_PARSER,
  HTML_VTT_PARSER,
  IMAGE_BUFFER,
  SMOOTH,
  METAPLAYLIST,
  DEBUG_ELEMENT,
]);

/* eslint-disable */
(window as any).RxPlayer = RxPlayer;
/* eslint-enable */

declare const __INCLUDE_WASM_PARSER__: boolean;

/* eslint-disable no-undef */
if (__INCLUDE_WASM_PARSER__) {
  /* eslint-enable no-undef */

  RxPlayer.addFeatures([DASH_WASM]);
  DASH_WASM.initialize({ wasmUrl: "./mpd-parser.wasm" }).catch((err) => {
    /* eslint-disable-next-line no-console */
    console.error("Error when initializing WASM DASH MPD parser:", err);
  });
}

VideoThumbnailLoader.addLoader(DASH_LOADER);

export interface IBifThumbnail {
  index: number;
  duration: number;
  ts: number;
  data: Uint8Array;
}

export interface IBufferedData {
  start: number;
  end: number;
  bufferedStart: number | undefined;
  bufferedEnd: number | undefined;
  infos: {
    adaptation: IAdaptation;
    representation: IRepresentation;
  };
}

export interface IPlayerModuleState {
  audioBitrate: number | undefined;
  audioBitrateAuto: boolean;
  autoPlayBlocked: boolean;
  availableAudioBitrates: number[];
  availableLanguages: IAvailableAudioTrack[];
  availableSubtitles: IAvailableTextTrack[];
  availableVideoBitrates: number[];
  availableVideoTracks: IAvailableVideoTrack[];
  bufferGap: number;
  bufferedData: null | {
    audio: IBufferedData[] | null;
    video: IBufferedData[] | null;
    text: IBufferedData[] | null;
  };
  cannotLoadMetadata: boolean;
  currentTime: number | undefined;
  duration: number | undefined;
  error: Error | null;
  hasCurrentContent: boolean;
  hasEnded: boolean;
  images: IBifThumbnail[];
  isBuffering: boolean;
  isCatchUpEnabled: boolean;
  isCatchingUp: boolean;
  isContentLoaded: boolean;
  isLive: boolean;
  isLoading: boolean;
  isPaused: boolean;
  isReloading: boolean;
  isSeeking: boolean;
  isStopped: boolean;
  language: IAudioTrack | undefined | null;
  liveGap: number | undefined;
  loadedVideo: ILoadVideoOptions | null;
  lowLatencyMode: boolean;
  livePosition: null | undefined | number;
  maximumPosition: null | undefined | number;
  minimumPosition: null | undefined | number;
  playbackRate: number;
  subtitle: ITextTrack | undefined | null;
  videoBitrate: number | undefined;
  videoBitrateAuto: boolean;
  videoTrack: IVideoTrack | undefined | null;
  volume: number;
  wallClockDiff: number | undefined;
  /**
   * If `true`, the currently set video track has a linked "trickmode" track.
   * @type {boolean}
   */
  videoTrackHasTrickMode: boolean;
  videoThumbnailsElement: HTMLVideoElement | null;
  videoThumbnailLoader: VideoThumbnailLoader | null;
}

const PlayerModule = declareModule(
  (): IPlayerModuleState => ({
    audioBitrate: undefined,
    audioBitrateAuto: true,
    autoPlayBlocked: false,
    availableAudioBitrates: [],
    availableLanguages: [],
    availableSubtitles: [],
    availableVideoBitrates: [],
    availableVideoTracks: [],
    bufferGap: 0,
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
    livePosition: undefined,
    maximumPosition: undefined,
    minimumPosition: undefined,
    playbackRate: 1,
    subtitle: undefined,
    videoBitrate: undefined,
    videoBitrateAuto: true,
    videoTrack: undefined,
    volume: 1,
    wallClockDiff: undefined,
    videoTrackHasTrickMode: false,
    videoThumbnailsElement: null,
    videoThumbnailLoader: null,
  }),
  (
    initOpts: IConstructorOptions & { textTrackElement?: HTMLElement },
    state,
    abortSignal,
  ) => {
    const { textTrackElement, ...constructorOpts } = initOpts;
    const player = new RxPlayer(constructorOpts);

    // facilitate DEV mode
    /* eslint-disable */
    (window as any).player = (window as any).rxPlayer = player;
    /* eslint-enable */

    linkPlayerEventsToState(player, state, abortSignal);

    const catchUpModeController = new CatchUpModeController(player, state);

    // dispose of the RxPlayer when destroyed
    abortSignal.addEventListener("abort", () => {
      player.dispose();
    });

    return {
      attachVideoThumbnailLoader() {
        const prevVideoThumbnailLoader = state.get("videoThumbnailLoader");
        if (prevVideoThumbnailLoader !== null) {
          prevVideoThumbnailLoader.dispose();
        }

        const thumbnailVideoElement = document.createElement("video");
        const videoThumbnailLoader = new VideoThumbnailLoader(
          thumbnailVideoElement,
          player,
        );
        state.updateBulk({
          videoThumbnailLoader,
          videoThumbnailsElement: thumbnailVideoElement,
        });
      },

      dettachVideoThumbnailLoader() {
        dettachVideoThumbnailLoader();
      },

      setVolume(volume: number) {
        player.setVolume(volume);
      },

      load(arg: ILoadVideoOptions) {
        dettachVideoThumbnailLoader();
        player.loadVideo(
          Object.assign(
            {
              textTrackElement,
              transportOptions: { checkMediaSegmentIntegrity: true },
            },
            arg,
          ) as ILoadVideoOptions,
        );
        state.updateBulk({
          loadedVideo: arg,
          lowLatencyMode: arg.lowLatencyMode === true,
        });
      },

      play() {
        player.play().catch(() => {
          // ignored
        });

        const isStopped = state.get("isStopped");
        const hasEnded = state.get("hasEnded");
        if (!isStopped && !hasEnded) {
          state.update("isPaused", false);
        }
      },

      pause() {
        player.pause();

        const isStopped = state.get("isStopped");
        const hasEnded = state.get("hasEnded");
        if (!isStopped && !hasEnded) {
          state.update("isPaused", true);
        }
      },

      stop() {
        dettachVideoThumbnailLoader();
        player.stop();
      },

      seek(position: number) {
        player.seekTo({ position });
      },

      mute() {
        player.mute();
      },

      unmute() {
        player.unMute();
      },

      setAudioBitrate(bitrate: number | undefined) {
        const bitrateSet = bitrate ?? 1;
        player.setAudioBitrate(bitrateSet);
        state.update("audioBitrateAuto", bitrateSet === -1);
      },

      setVideoBitrate(bitrate: number | undefined) {
        const bitrateSet = bitrate ?? 1;
        player.setVideoBitrate(bitrateSet);
        state.update("videoBitrateAuto", bitrateSet === -1);
      },

      setAudioTrack(track: IAudioTrack) {
        player.setAudioTrack(track.id as string);
      },

      setVideoTrack(track: IVideoTrack) {
        player.setVideoTrack(track.id as string);
      },

      disableVideoTrack() {
        player.disableVideoTrack();
      },

      setTextTrack(track: ITextTrack) {
        player.setTextTrack(track.id as string);
      },

      disableSubtitlesTrack() {
        player.disableTextTrack();
      },

      setPlaybackRate(rate: number) {
        player.setPlaybackRate(rate);
        state.update("playbackRate", rate);
      },

      enableLiveCatchUp() {
        catchUpModeController.enableCatchUp();
      },

      disableLiveCatchUp() {
        catchUpModeController.stopCatchUp();
      },
    };

    function dettachVideoThumbnailLoader() {
      const videoThumbnailLoader = state.get("videoThumbnailLoader");
      if (videoThumbnailLoader !== null) {
        videoThumbnailLoader.dispose();
        state.updateBulk({
          videoThumbnailLoader: null,
          videoThumbnailsElement: null,
        });
      }
    }
  },
);

export type IPlayerModule = InstanceType<typeof PlayerModule>;
export default PlayerModule;
