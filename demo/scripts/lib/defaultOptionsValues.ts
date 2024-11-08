import type {
  ICmcdOptions,
  IConstructorOptions,
  ILoadVideoOptions,
  IPlaybackRateBasedRebufferingAvoidanceSettings,
} from "../../../src/public_types.ts";

const defaultOptionsValues = {
  player: {
    videoResolutionLimit: "none",
    maxBufferAhead: Infinity,
    maxBufferBehind: Infinity,
    maxVideoBufferSize: Infinity,
    throttleVideoBitrateWhenHidden: false,
    wantedBufferAhead: 30,
  },
  loadVideo: {
    autoPlay: true,
    checkManifestIntegrity: false,
    checkMediaSegmentIntegrity: false,
    cmcd: undefined as ICmcdOptions | undefined,
    defaultAudioTrackSwitchingMode: "reload",
    enableFastSwitching: true,
    requestConfig: {
      segment: {
        maxRetry: 4,
        timeout: 30000,
      },
      manifest: {
        maxRetry: 4,
        timeout: 30000,
      },
    },
    onCodecSwitch: "continue",
    onAudioTracksNotPlayable: "error",
    onVideoTracksNotPlayable: "error",
    experimentalOptions: {
      enableRepresentationAvoidance: true,
      playbackRateBasedRebufferingAvoidanceSettings: {
        onBufferGapSize: 0,
        minPlaybackRate: 0.95,
      } as IPlaybackRateBasedRebufferingAvoidanceSettings,
    },
  },
} satisfies {
  player: IConstructorOptions;
  loadVideo: Omit<ILoadVideoOptions, "transport">;
};

export type IConstructorSettings = typeof defaultOptionsValues.player;
export type ILoadVideoSettings = typeof defaultOptionsValues.loadVideo;

export default defaultOptionsValues;
