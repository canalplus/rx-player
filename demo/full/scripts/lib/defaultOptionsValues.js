const defaultOptionsValues = {
  autoPlay: true,
  manualBrSwitchingMode: "direct",
  initialVideoBr: 0,
  initialAudioBr: 0,
  minVideoBr: 0,
  minAudioBr: 0,
  maxVideoBr: Infinity,
  maxAudioBr: Infinity,
  limitVideoWidth: false,
  throttleVideoBitrateWhenHidden: false,
  segmentRetry: 4,
  manifestRetry: 4,
  offlineRetry: Infinity,
  enableFastSwitching: true,
  audioTrackSwitchingMode: "direct",
  onCodecSwitch: "continue",
  wantedBufferAhead: 30,
  maxBufferAhead: Infinity,
  maxBufferBehind: Infinity,
};

export default defaultOptionsValues;
