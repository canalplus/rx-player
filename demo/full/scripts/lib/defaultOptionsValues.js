const defaultOptionsValues = {
  autoPlay: true,
  manualBrSwitchingMode: "direct",
  limitVideoWidth: false,
  throttleVideoBitrateWhenHidden: false,
  segmentRetry: 4,
  manifestRetry: 4,
  segmentTimeout: 30000,
  manifestTimeout: 30000,
  enableFastSwitching: true,
  defaultAudioTrackSwitchingMode: "reload",
  onCodecSwitch: "continue",
  wantedBufferAhead: 30,
  maxVideoBufferSize: Infinity,
  maxBufferAhead: Infinity,
  maxBufferBehind: Infinity,
};

export default defaultOptionsValues;
