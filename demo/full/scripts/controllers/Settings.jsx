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
      initialVideoBr,
      initialAudioBr,
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
      segmentTimeout,
      manifestRetry,
      offlineRetry,
      manifestTimeout,
    } = this.state;
    return {
      initOpts: {
        initialVideoBitrate: parseFloat(initialVideoBr),
        initialAudioBitrate: parseFloat(initialAudioBr),
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
          segmentRequestTimeout: parseFloat(segmentTimeout),
          manifestRetry: parseFloat(manifestRetry),
          manifestRequestTimeout: parseFloat(manifestTimeout),
          offlineRetry: parseFloat(offlineRetry),
        },
      },
    };
  }

  onAutoPlayClick(evt) {
    this.setState({ autoPlay: getCheckBoxValue(evt.target) });
  }

  onInitialVideoBrInput(value) {
    this.setState({ initialVideoBr: value });
  }

  onInitialAudioBrInput(value) {
    this.setState({ initialAudioBr: value });
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

  onSegmentTimeoutInput(value) {
    this.setState({ segmentTimeout: value });
  }

  onManifestRetryInput(value) {
    this.setState({ manifestRetry: value });
  }

  onOfflineRetryInput(value) {
    this.setState({ offlineRetry: value });
  }

  onManifestTimeoutInput(value) {
    this.setState({ manifestTimeout: value });
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
      initialVideoBr,
      initialAudioBr,
      minVideoBr,
      minAudioBr,
      maxVideoBr,
      maxAudioBr,
      limitVideoWidth,
      throttleVideoBitrateWhenHidden,
      segmentRetry,
      segmentTimeout,
      manifestRetry,
      offlineRetry,
      manifestTimeout,
      enableFastSwitching,
      defaultAudioTrackSwitchingMode,
      onCodecSwitch,
      wantedBufferAhead,
      maxVideoBufferSize,
      maxBufferAhead,
      maxBufferBehind,
    } = this.state;

    const initialSettings = {
      initialVideoBr,
      initialAudioBr,
      minAudioBr,
      minVideoBr,
      maxVideoBr,
      maxAudioBr,
      limitVideoWidth,
      throttleVideoBitrateWhenHidden,
      onInitialVideoBrInput: this.onInitialVideoBrInput.bind(this),
      onInitialAudioBrInput: this.onInitialAudioBrInput.bind(this),
      onMinAudioBrInput: this.onMinAudioBrInput.bind(this),
      onMinVideoBrInput: this.onMinVideoBrInput.bind(this),
      onMaxAudioBrInput: this.onMaxAudioBrInput.bind(this),
      onMaxVideoBrInput: this.onMaxVideoBrInput.bind(this),
      onLimitVideoWidthClick: this.onLimitVideoWidthClick.bind(this),
      onThrottleVideoBitrateWhenHiddenClick:
        this.onThrottleVideoBitrateWhenHiddenClick.bind(this),
    };

    const networkConfig = {
      manifestTimeout,
      segmentRetry,
      segmentTimeout,
      manifestRetry,
      offlineRetry,
      onSegmentRetryInput: this.onSegmentRetryInput.bind(this),
      onSegmentTimeoutInput: this.onSegmentTimeoutInput.bind(this),
      onManifestRetryInput: this.onManifestRetryInput.bind(this),
      onManifestTimeoutInput: this.onManifestTimeoutInput.bind(this),
      onOfflineRetryInput: this.onOfflineRetryInput.bind(this),
    };

    const trackSwitchModeConfig = {
      enableFastSwitching,
      defaultAudioTrackSwitchingMode,
      onCodecSwitch,
      onEnableFastSwitchingClick: this.onEnableFastSwitchingClick.bind(this),
      onDefaultAudioTrackSwitchingModeChange:
        this.defaultAudioTrackSwitchingMode.bind(this),
      onCodecSwitchChange: this.onCodecSwitchChange.bind(this),
    };

    if (!this.props.showOptions) {
      return null;
    }

    return (
      <div className="settingsWrapper">
        <div className="settings-title">
          Content options
        </div>
        <div className="settings-note">
          Note: Those options won't be retroactively applied to
          already-loaded contents
        </div>
        <div style={{ display: "flex" }}>
          <Option title="Playback">
            <Playback
              autoPlay={autoPlay}
              onAutoPlayClick={this.onAutoPlayClick.bind(this)}
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
              onWantedBufferAheadInput={
                this.onWantedBufferAheadInput.bind(this)
              }
              onMaxBufferAheadInput={this.onMaxBufferAheadInput.bind(this)}
              onMaxBufferBehindInput={this.onMaxBufferBehindInput.bind(this)}
              onMaxVideoBufferSizeInput={
                this.onMaxVideoBufferSizeInput.bind(this)
              }
            />
          </Option>
        </div>
      </div>
    );
  }
}

export default Settings;
