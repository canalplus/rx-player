const defaultOptionsValues = {
  player: {
    limitVideoWidth: false,
    maxBufferAhead: Infinity,
    maxBufferBehind: Infinity,
    maxVideoBufferSize: Infinity,
    throttleVideoBitrateWhenHidden: false,
    wantedBufferAhead: 30,
  },
  loadVideo: {
    autoPlay: true,
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
};

export type IConstructorSettings = typeof defaultOptionsValues.player;
export type ILoadVideoSettings = typeof defaultOptionsValues.loadVideo;

export default defaultOptionsValues;
