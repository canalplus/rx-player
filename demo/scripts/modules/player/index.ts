/**
 * # Player Module
 *
 * Instanciate a new RxPlayer, link its state and this module's state, provide
 * actions to allow easy interactions with the player to the rest of the
 * application.
 */

import {
  DASH,
  DASH_WASM,
  DEBUG_ELEMENT,
  DIRECTFILE,
  EME,
  HTML_SAMI_PARSER,
  HTML_SRT_PARSER,
  HTML_TEXT_BUFFER,
  HTML_TTML_PARSER,
  HTML_VTT_PARSER,
  SMOOTH,
} from "../../../../src/features/list";
import { METAPLAYLIST, MULTI_THREAD } from "../../../../src/experimental/features";
import RxPlayer from "../../../../src/minimal";
import { linkPlayerEventsToState } from "./events";
import VideoThumbnailLoader, {
  DASH_LOADER,
} from "../../../../src/experimental/tools/VideoThumbnailLoader";
import CatchUpModeController from "./catchUp";
import { declareModule } from "../../lib/declareModule";
import type {
  IAudioRepresentation,
  IAudioTrack,
  IAvailableAudioTrack,
  IAvailableTextTrack,
  IAvailableVideoTrack,
  IConstructorOptions,
  ILoadVideoOptions,
  IAudioRepresentationsSwitchingMode,
  IVideoRepresentationsSwitchingMode,
  ITextTrack,
  IVideoRepresentation,
  IVideoTrack,
} from "../../../../src/public_types";

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
  DEBUG_ELEMENT,
  MULTI_THREAD,
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
    adaptation: {
      id: string;
      type: string;
      language?: string | undefined;
      isAudioDescription?: boolean | undefined;
      isClosedCaption?: boolean | undefined;
    };
    representation: { codecs?: string[]; uniqueId: string; bitrate: number; id: string };
  };
}

export interface IPlayerModuleState {
  audioRepresentation: IAudioRepresentation | undefined | null;
  audioRepresentationsLocked: boolean;
  autoPlayBlocked: boolean;
  availableAudioTracks: IAvailableAudioTrack[];
  availableSubtitles: IAvailableTextTrack[];
  availableVideoTracks: IAvailableVideoTrack[];
  bufferGap: number;
  bufferedData: null | {
    audio: IBufferedData[] | null;
    video: IBufferedData[] | null;
    text: IBufferedData[] | null;
  };
  cannotLoadMetadata: boolean;
  currentTime: number | undefined;
  defaultAudioRepresentationsSwitchingMode: IAudioRepresentationsSwitchingMode;
  defaultVideoRepresentationsSwitchingMode: IVideoRepresentationsSwitchingMode;
  duration: number | undefined;
  error: Error | null;
  hasCurrentContent: boolean;
  hasEnded: boolean;
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
  audioTrack: IAudioTrack | undefined | null;
  liveGap: number | undefined;
  loadedVideo: ILoadVideoOptions | null;
  lowLatencyMode: boolean;
  livePosition: null | undefined | number;
  maximumPosition: null | undefined | number;
  minimumPosition: null | undefined | number;
  playbackRate: number;
  /** Try to play contents in "multithread" mode when possible. */
  relyOnWorker: boolean;
  /** Currently playing a content in "multithread" mode. */
  useWorker: boolean;
  subtitle: ITextTrack | undefined | null;
  videoRepresentation: IVideoRepresentation | undefined | null;
  videoRepresentationsLocked: boolean;
  videoTrack: IVideoTrack | undefined | null;
  volumeInfo: {
    volume: number;
    muted: boolean;
  };
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
    audioRepresentation: undefined,
    audioRepresentationsLocked: false,
    autoPlayBlocked: false,
    availableAudioTracks: [],
    availableSubtitles: [],
    availableVideoTracks: [],
    bufferGap: 0,
    bufferedData: null,
    cannotLoadMetadata: false,
    currentTime: undefined,
    defaultAudioRepresentationsSwitchingMode: "reload",
    defaultVideoRepresentationsSwitchingMode: "reload",
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
    livePosition: undefined,
    maximumPosition: undefined,
    minimumPosition: undefined,
    playbackRate: 1,
    relyOnWorker: false,
    useWorker: false,
    subtitle: undefined,
    videoRepresentation: undefined,
    videoRepresentationsLocked: false,
    videoTrack: undefined,
    volumeInfo: {
      volume: 1,
      muted: false,
    },
    wallClockDiff: undefined,
    videoTrackHasTrickMode: false,
    videoThumbnailsElement: null,
    videoThumbnailLoader: null,
  }),
  (
    initOpts: IConstructorOptions & {
      textTrackElement?: HTMLElement;
      debugElement: HTMLElement;
    },
    state,
    abortSignal,
  ) => {
    let hasAttachedMultithread = false;
    const { debugElement, textTrackElement, ...constructorOpts } = initOpts;
    const player = new RxPlayer(constructorOpts);
    let debugEltInstance: { dispose(): void } | undefined;

    // facilitate DEV mode
    /* eslint-disable */
    (window as any).player = (window as any).rxPlayer = player;
    /* eslint-enable */

    linkPlayerEventsToState(player, state, abortSignal);

    const catchUpModeController = new CatchUpModeController(player, state);

    // dispose of the RxPlayer when destroyed
    abortSignal.addEventListener("abort", () => {
      player.dispose();
      if (debugEltInstance !== undefined) {
        debugEltInstance.dispose();
      }
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

      updateWorkerMode(enabled: boolean) {
        if (enabled && !hasAttachedMultithread) {
          attachMultithread(player);
        }
        state.update("relyOnWorker", enabled);
      },

      load(arg: ILoadVideoOptions) {
        dettachVideoThumbnailLoader();
        player.loadVideo(
          Object.assign(
            {
              mode: state.get("relyOnWorker") ? "auto" : "main",
              textTrackElement,
              transportOptions: { checkMediaSegmentIntegrity: true },
            },
            {
              startAt: {
                fromFirstPosition: 0,
              },
            },
            arg,
          ) as ILoadVideoOptions,
        );
        const newState: Partial<IPlayerModuleState> = {
          loadedVideo: arg,
          lowLatencyMode: arg.lowLatencyMode === true,
        };
        state.updateBulk(newState);
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

      setDefaultVideoRepresentationSwitchingMode(
        mode: IVideoRepresentationsSwitchingMode,
      ): void {
        state.update("defaultVideoRepresentationsSwitchingMode", mode);
      },

      setDefaultAudioRepresentationSwitchingMode(
        mode: IAudioRepresentationsSwitchingMode,
      ): void {
        state.update("defaultAudioRepresentationsSwitchingMode", mode);
      },

      lockVideoRepresentations(reps: IVideoRepresentation[]) {
        player.lockVideoRepresentations({
          representations: reps.map((r) => r.id),
          switchingMode: state.get("defaultVideoRepresentationsSwitchingMode"),
        });
        state.update(
          "videoRepresentationsLocked",
          player.getLockedVideoRepresentations() !== null,
        );
      },

      unlockVideoRepresentations: () => {
        player.unlockVideoRepresentations();
        state.update(
          "videoRepresentationsLocked",
          player.getLockedVideoRepresentations() !== null,
        );
      },

      lockAudioRepresentations(reps: IAudioRepresentation[]) {
        player.lockAudioRepresentations({
          representations: reps.map((r) => String(r.id)),
          switchingMode: state.get("defaultAudioRepresentationsSwitchingMode"),
        });
        state.update(
          "audioRepresentationsLocked",
          player.getLockedAudioRepresentations() !== null,
        );
      },

      unlockAudioRepresentations: () => {
        player.unlockAudioRepresentations();
        state.update(
          "audioRepresentationsLocked",
          player.getLockedAudioRepresentations() !== null,
        );
      },

      setAudioTrack(track: IAudioTrack) {
        player.setAudioTrack(track.id);
      },

      setVideoTrack(track: IVideoTrack) {
        player.setVideoTrack(track.id);
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

      showDebugElement() {
        if (debugEltInstance !== undefined) {
          debugEltInstance.dispose();
        }
        debugEltInstance = player.createDebugElement(debugElement);
      },
      hideDebugElement() {
        if (debugEltInstance !== undefined) {
          debugEltInstance.dispose();
          debugEltInstance = undefined;
        }
      },
      isDebugElementShown() {
        return debugEltInstance !== undefined;
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

    function attachMultithread(player: RxPlayer) {
      hasAttachedMultithread = true;
      player
        .attachWorker({
          workerUrl: "./worker.js",
          dashWasmUrl: "./mpd-parser.wasm",
        })
        .catch((err) => {
          /* eslint-disable-next-line no-console */
          console.error("Error when attaching worker:", err);
        });
    }
  },
);

export type IPlayerModule = InstanceType<typeof PlayerModule>;
export default PlayerModule;
