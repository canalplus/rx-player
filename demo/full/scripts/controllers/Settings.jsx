import React from "react";

import getCheckBoxValue from "../lib/getCheckboxValue";

import Option from "../components/Options/Option";
import Playback from "../components/Options/Playback.jsx";
import AudioAdaptiveSettings from "../components/Options/AudioAdaptiveSettings";
import VideoAdaptiveSettings from "../components/Options/VideoAdaptiveSettings.jsx";
import NetworkConfig from "../components/Options/NetworkConfig.jsx";
import TrackSwitch from "../components/Options/TrackSwitch.jsx";
import BufferOptions from "../components/Options/BufferOptions.jsx";

import defaultOptionsValues from "../lib/defaultOptionsValues";

class Settings extends React.Component {
  constructor(...args) {
    super(...args);

    this.state = Object.assign({}, defaultOptionsValues);
  }

  getOptions() {
    const {
      minVideoBr,
      minAudioBr,
      maxVideoBr,
      maxAudioBr,
      wantedBufferAhead,
      maxVideoBufferSize,
      maxBufferAhead,
      maxBufferBehind,
      limitVideoWidth,
      throttleVideoBitrateWhenHidden,
      autoPlay,
      defaultAudioTrackSwitchingMode,
      onCodecSwitch,
      enableFastSwitching,
      segmentRetry,
      manifestRetry,
      offlineRetry,
    } = this.state;
    return {
      initOpts: {
        minVideoBitrate: parseFloat(minVideoBr),
        minAudioBitrate: parseFloat(minAudioBr),
        maxVideoBitrate: parseFloat(maxVideoBr),
        maxAudioBitrate: parseFloat(maxAudioBr),
        wantedBufferAhead: parseFloat(wantedBufferAhead),
        maxVideoBufferSize: parseFloat(maxVideoBufferSize),
        maxBufferAhead: parseFloat(maxBufferAhead),
        maxBufferBehind: parseFloat(maxBufferBehind),
        limitVideoWidth,
        throttleVideoBitrateWhenHidden,
      },
      loadVideoOpts: {
        autoPlay,
        defaultAudioTrackSwitchingMode,
        onCodecSwitch,
        enableFastSwitching,
        networkConfig: {
          segmentRetry: parseFloat(segmentRetry),
          manifestRetry: parseFloat(manifestRetry),
          offlineRetry: parseFloat(offlineRetry),
        },
      },
    };
  }

  onAutoPlayClick(evt) {
    this.setState({ autoPlay: getCheckBoxValue(evt.target) });
  }

  onMinVideoBrInput(value) {
    this.setState({ minVideoBr: value });
  }

  onMinAudioBrInput(value) {
    this.setState({ minAudioBr: value });
  }

  onMaxVideoBrInput(value) {
    this.setState({ maxVideoBr: value });
  }

  onMaxAudioBrInput(value) {
    this.setState({ maxAudioBr: value });
  }

  onLimitVideoWidthClick(evt) {
    this.setState({ limitVideoWidth: getCheckBoxValue(evt.target) });
  }

  onThrottleVideoBitrateWhenHiddenClick(evt) {
    this.setState({
      throttleVideoBitrateWhenHidden: getCheckBoxValue(evt.target),
    });
  }

  onSegmentRetryInput(value) {
    this.setState({ segmentRetry: value });
  }

  onManifestRetryInput(value) {
    this.setState({ manifestRetry: value });
  }

  onOfflineRetryInput(value) {
    this.setState({ offlineRetry: value });
  }

  onEnableFastSwitchingClick(evt) {
    this.setState({ enableFastSwitching: getCheckBoxValue(evt.target) });
  }

  onDefaultAudioTrackSwitchingModeChange(value) {
    this.setState({ defaultAudioTrackSwitchingMode: value });
  }

  onCodecSwitchChange(value) {
    this.setState({ onCodecSwitch: value });
  }

  onWantedBufferAheadInput(value) {
    this.setState({ wantedBufferAhead: value });
  }

  onMaxVideoBufferSizeInput(value) {
    this.setState({ maxVideoBufferSize: value});
  }

  onMaxBufferBehindInput(value) {
    this.setState({ maxBufferBehind: value });
  }

  onMaxBufferAheadInput(value) {
    this.setState({ maxBufferAhead: value });
  }

  render() {
    const {
      autoPlay,
      minVideoBr,
      minAudioBr,
      maxVideoBr,
      maxAudioBr,
      limitVideoWidth,
      throttleVideoBitrateWhenHidden,
      segmentRetry,
      manifestRetry,
      offlineRetry,
      enableFastSwitching,
      defaultAudioTrackSwitchingMode,
      onCodecSwitch,
      wantedBufferAhead,
      maxVideoBufferSize,
      maxBufferAhead,
      maxBufferBehind,
    } = this.state;

    const initialSettings = {
      minAudioBr,
      minVideoBr,
      maxVideoBr,
      maxAudioBr,
      limitVideoWidth,
      throttleVideoBitrateWhenHidden,
      onMinAudioBrInput: this.onMinAudioBrInput,
      onMinVideoBrInput: this.onMinVideoBrInput,
      onMaxAudioBrInput: this.onMaxAudioBrInput,
      onMaxVideoBrInput: this.onMaxVideoBrInput,
      onLimitVideoWidthClick: this.onLimitVideoWidthClick,
      onThrottleVideoBitrateWhenHiddenClick:
        this.onThrottleVideoBitrateWhenHiddenClick,
    };

    const networkConfig = {
      segmentRetry,
      manifestRetry,
      offlineRetry,
      onSegmentRetryInput: this.onSegmentRetryInput,
      onManifestRetryInput: this.onManifestRetryInput,
      onOfflineRetryInput: this.onOfflineRetryInput,
    };

    const trackSwitchModeConfig = {
      enableFastSwitching,
      defaultAudioTrackSwitchingMode,
      onCodecSwitch,
      onEnableFastSwitchingClick: this.onEnableFastSwitchingClick,
      onDefaultAudioTrackSwitchingModeChange:
        this.defaultAudioTrackSwitchingMode,
      onCodecSwitchChange: this.onCodecSwitchChange,
    };

    if (!this.props.showOptions) {
      return null;
    }

    return (
      <div className="settingsWrapper">
        <div style={{ display: "flex" }}>
          <Option title="Playback">
            <Playback
              autoPlay={autoPlay}
              onAutoPlayClick={this.onAutoPlayClick}
            />
          </Option>
          <Option title="Video adaptive settings">
            <VideoAdaptiveSettings {...initialSettings} />
          </Option>
          <Option title="Audio adaptive settings">
            <AudioAdaptiveSettings {...initialSettings} />
          </Option>
        </div>
        <div style={{ display: "flex" }}>
          <Option title="Network Config">
            <NetworkConfig {...networkConfig} />
          </Option>
          <Option title="Track Switch Mode">
            <TrackSwitch {...trackSwitchModeConfig} />
          </Option>
          <Option title="Buffer Options">
            <BufferOptions
              wantedBufferAhead={wantedBufferAhead}
              maxVideoBufferSize={maxVideoBufferSize}
              maxBufferAhead={maxBufferAhead}
              maxBufferBehind={maxBufferBehind}
              onWantedBufferAheadInput={this.onWantedBufferAheadInput}
              onMaxBufferAheadInput={this.onMaxBufferAheadInput}
              onMaxBufferBehindInput={this.onMaxBufferBehindInput}
              onMaxVideoBufferSizeInput={this.onMaxVideoBufferSizeInput}
            />
          </Option>
        </div>
      </div>
    );
  }
}

export default Settings;
