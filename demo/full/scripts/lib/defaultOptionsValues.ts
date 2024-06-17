import type {
  ICmcdOptions,
  IConstructorOptions,
  ILoadVideoOptions,
} from "../../../../src/public_types";

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
  },
} satisfies {
  player: IConstructorOptions;
  loadVideo: Omit<ILoadVideoOptions, "transport">;
};

export type IConstructorSettings = typeof defaultOptionsValues.player;
export type ILoadVideoSettings = typeof defaultOptionsValues.loadVideo;

export default defaultOptionsValues;
