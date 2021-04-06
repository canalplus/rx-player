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
    audioTrackSwitchingMode: "reload",
    autoPlay: true,
    enableFastSwitching: true,
    manualBitrateSwitchingMode: "direct",
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
