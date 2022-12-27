import React from "react";

import getCheckBoxValue from "../lib/getCheckboxValue";

import Option from "../components/Options/Option";
import Playback from "../components/Options/Playback.jsx";
import AudioAdaptiveSettings from "../components/Options/AudioAdaptiveSettings";
import VideoAdaptiveSettings from "../components/Options/VideoAdaptiveSettings.jsx";
import RequestConfig from "../components/Options/RequestConfig.jsx";
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
      manifestTimeout,
    } = this.state;
    return {
      initOpts: {
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
        requestConfig: {
          segment: {
            maxRetry: parseFloat(segmentRetry),
            timeout: parseFloat(segmentTimeout),
          },
          manifest: {
            maxRetry: parseFloat(manifestRetry),
            timeout: parseFloat(manifestTimeout),
          },
        },
      },
    };
  }

  onAutoPlayClick(evt) {
    this.setState({ autoPlay: getCheckBoxValue(evt.target) });
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
      limitVideoWidth,
      throttleVideoBitrateWhenHidden,
      segmentRetry,
      segmentTimeout,
      manifestRetry,
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
      limitVideoWidth,
      throttleVideoBitrateWhenHidden,
      onLimitVideoWidthClick: this.onLimitVideoWidthClick.bind(this),
      onThrottleVideoBitrateWhenHiddenClick:
        this.onThrottleVideoBitrateWhenHiddenClick.bind(this),
    };

    const requestConfig = {
      manifestTimeout,
      segmentRetry,
      segmentTimeout,
      manifestRetry,
      onSegmentRetryInput: this.onSegmentRetryInput.bind(this),
      onSegmentTimeoutInput: this.onSegmentTimeoutInput.bind(this),
      onManifestRetryInput: this.onManifestRetryInput.bind(this),
      onManifestTimeoutInput: this.onManifestTimeoutInput.bind(this),
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
          <Option title="Request Config">
            <RequestConfig {...requestConfig} />
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
