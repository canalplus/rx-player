const defaultOptionsValues = {
  autoPlay: true,
  manualBrSwitchingMode: "direct",
  limitVideoWidth: false,
  throttleVideoBitrateWhenHidden: false,
  segmentRetry: 4,
  manifestRetry: 4,
  offlineRetry: Infinity,
  enableFastSwitching: true,
  defaultAudioTrackSwitchingMode: "reload",
  onCodecSwitch: "continue",
  wantedBufferAhead: 30,
  maxVideoBufferSize: Infinity,
  maxBufferAhead: Infinity,
  maxBufferBehind: Infinity,
};

export default defaultOptionsValues;
