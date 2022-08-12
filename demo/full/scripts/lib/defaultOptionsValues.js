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

export default defaultOptionsValues;
