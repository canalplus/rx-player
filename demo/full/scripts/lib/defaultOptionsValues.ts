const defaultOptionsValues = {
  player: {
    initialAudioBitrate: 0,
    initialVideoBitrate: 0,
    limitVideoWidth: false,
    maxAudioBitrate: Infinity,
    maxBufferAhead: Infinity,
    maxBufferBehind: Infinity,
    maxVideoBitrate: Infinity,
    maxVideoBufferSize: Infinity,
    minAudioBitrate: 0,
    minVideoBitrate: 0,
    throttleVideoBitrateWhenHidden: false,
    wantedBufferAhead: 30,
  },
  loadVideo: {
    autoPlay: true,
    defaultAudioTrackSwitchingMode: "reload",
    enableFastSwitching: true,
    networkConfig: {
      manifestRetry: 4,
      manifestRequestTimeout: 30000,
      offlineRetry: Infinity,
      segmentRetry: 4,
      segmentRequestTimeout: 30000,
    },
    onCodecSwitch: "continue",
  },
};

export type IConstructorSettings = typeof defaultOptionsValues.player;
export type ILoadVideoSettings = typeof defaultOptionsValues.loadVideo;

export default defaultOptionsValues;
