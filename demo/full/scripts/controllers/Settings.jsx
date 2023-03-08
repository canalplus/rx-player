import React, {useCallback} from "react";
import Option from "../components/Options/Option";
import Playback from "../components/Options/Playback.jsx";
import AudioAdaptiveSettings from "../components/Options/AudioAdaptiveSettings";
import VideoAdaptiveSettings from "../components/Options/VideoAdaptiveSettings.jsx";
import RequestConfig from "../components/Options/RequestConfig.jsx";
import TrackSwitch from "../components/Options/TrackSwitch.jsx";
import BufferOptions from "../components/Options/BufferOptions.jsx";

function Settings({
  playerOptions,
  updatePlayerOptions,
  loadVideoOptions,
  updateLoadVideoOptions,
  showOptions,
}) {
  const {
    limitVideoWidth,
    maxBufferAhead,
    maxBufferBehind,
    maxVideoBufferSize,
    throttleVideoBitrateWhenHidden,
    wantedBufferAhead,
  } = playerOptions;
  const {
    autoPlay,
    defaultAudioRepresentationsSwitchingMode,
    defaultVideoRepresentationsSwitchingMode,
    defaultAudioTrackSwitchingMode,
    enableFastSwitching,
    requestConfig,
    onCodecSwitch,
  } = loadVideoOptions;
  const {
    manifest: manifestRequestConfig,
    segment: segmentRequestConfig,
  } = requestConfig;
  const {
    maxRetry: segmentRetry,
    timeout: segmentRequestTimeout,
  } = segmentRequestConfig;
  const {
    maxRetry: manifestRetry,
    timeout: manifestRequestTimeout,
  } = manifestRequestConfig;

  const onAutoPlayChange = useCallback((autoPlay) => {
    updateLoadVideoOptions((prevOptions) => {
      if (autoPlay === prevOptions.autoPlay) {
        return prevOptions;
      }
      return Object.assign({}, prevOptions, { autoPlay });
    });
  }, [updateLoadVideoOptions]);

  const onLimitVideoWidthChange = useCallback((limitVideoWidth) => {
    updatePlayerOptions((prevOptions) => {
      if (limitVideoWidth === prevOptions.limitVideoWidth) {
        return prevOptions;
      }
      return Object.assign({}, prevOptions, { limitVideoWidth });
    });
  }, [updatePlayerOptions]);

  const onThrottleVideoBitrateWhenHiddenChange = useCallback((value) => {
    updatePlayerOptions((prevOptions) => {
      if (value === prevOptions.throttleVideoBitrateWhenHidden) {
        return prevOptions;
      }
      return Object.assign({}, prevOptions, {
        throttleVideoBitrateWhenHidden: value,
      });
    });
  }, [updatePlayerOptions]);

  const onSegmentRetryChange = useCallback((segmentRetry) => {
    updateLoadVideoOptions((prevOptions) => {
      if (segmentRetry === prevOptions.requestConfig.segment.maxRetry) {
        return prevOptions;
      }
      return Object.assign({}, prevOptions, {
        requestConfig: Object.assign({}, prevOptions.requestConfig, {
          segment: Object.assign({}, prevOptions.requestConfig.segment, {
            maxRetry: segmentRetry,
          }),
        }),
      });
    });
  }, [updateLoadVideoOptions]);

  const onSegmentRequestTimeoutChange = useCallback((segmentRequestTimeout) => {
    updateLoadVideoOptions((prevOptions) => {
      if (
        segmentRequestTimeout === prevOptions.requestConfig.segment.timeout
      ) {
        return prevOptions;
      }
      return Object.assign({}, prevOptions, {
        requestConfig: Object.assign({}, prevOptions.requestConfig, {
          segment: Object.assign({}, prevOptions.requestConfig.segment, {
            timeout: segmentRequestTimeout,
          }),
        }),
      });
    });
  }, [updateLoadVideoOptions]);

  const onManifestRetryChange = useCallback((manifestRetry) => {
    updateLoadVideoOptions((prevOptions) => {
      if (manifestRetry === prevOptions.requestConfig.manifest.maxRetry) {
        return prevOptions;
      }
      return Object.assign({}, prevOptions, {
        requestConfig: Object.assign({}, prevOptions.requestConfig, {
          manifest: Object.assign({}, prevOptions.requestConfig.manifest, {
            maxRetry: manifestRetry,
          }),
        }),
      });
    });
  }, [updateLoadVideoOptions]);

  const onManifestRequestTimeoutChange = useCallback(
    (manifestRequestTimeout) => {
      updateLoadVideoOptions((prevOptions) => {
        if (
          manifestRequestTimeout === prevOptions.requestConfig.manifest.timeout
        ) {
          return prevOptions;
        }
        return Object.assign({}, prevOptions, {
          requestConfig: Object.assign({}, prevOptions.requestConfig, {
            manifest: Object.assign({}, prevOptions.requestConfig.manifest, {
              timeout: manifestRequestTimeout,
            }),
          }),
        });
      });
    },
    [updateLoadVideoOptions]
  );

  const onEnableFastSwitchingChange = useCallback((enableFastSwitching) => {
    updateLoadVideoOptions((prevOptions) => {
      if (enableFastSwitching === prevOptions.enableFastSwitching) {
        return prevOptions;
      }
      return Object.assign({}, prevOptions, { enableFastSwitching });
    });
  }, [updateLoadVideoOptions]);

  const onDefaultVideoRepresentationsSwitchingModeChange =
    useCallback((value) => {
      updateLoadVideoOptions((prevOptions) => {
        if (value === prevOptions.defaultVideoRepresentationsSwitchingMode) {
          return prevOptions;
        }
        return Object.assign({}, prevOptions, {
          defaultVideoRepresentationsSwitchingMode: value,
        });
      });
    }, [updateLoadVideoOptions]);

  const onDefaultAudioRepresentationsSwitchingModeChange =
    useCallback((value) => {
      updateLoadVideoOptions((prevOptions) => {
        if (value === prevOptions.defaultAudioRepresentationsSwitchingMode) {
          return prevOptions;
        }
        return Object.assign({}, prevOptions, {
          defaultAudioRepresentationsSwitchingMode: value,
        });
      });
    }, [updateLoadVideoOptions]);

  const onDefaultAudioTrackSwitchingModeChange = useCallback((value) => {
    updateLoadVideoOptions((prevOptions) => {
      if (value === prevOptions.defaultAudioTrackSwitchingMode) {
        return prevOptions;
      }
      return Object.assign({}, prevOptions, {
        defaultAudioTrackSwitchingMode: value,
      });
    });
  }, [updateLoadVideoOptions]);

  const onCodecSwitchChange = useCallback((value) => {
    updateLoadVideoOptions((prevOptions) => {
      if (value === prevOptions.onCodecSwitch) {
        return prevOptions;
      }
      return Object.assign({}, prevOptions, {
        onCodecSwitch: value,
      });
    });
  }, [updateLoadVideoOptions]);

  const onWantedBufferAheadChange = useCallback((wantedBufferAhead) => {
    updatePlayerOptions((prevOptions) => {
      if (wantedBufferAhead === prevOptions.wantedBufferAhead) {
        return prevOptions;
      }
      return Object.assign({}, prevOptions, { wantedBufferAhead });
    });
  }, [playerOptions]);

  const onMaxVideoBufferSizeChange = useCallback((maxVideoBufferSize) => {
    updatePlayerOptions((prevOptions) => {
      if (maxVideoBufferSize === prevOptions.maxVideoBufferSize) {
        return prevOptions;
      }
      return Object.assign({}, prevOptions, { maxVideoBufferSize });
    });
  }, [playerOptions]);

  const onMaxBufferBehindChange = useCallback((maxBufferBehind) => {
    updatePlayerOptions((prevOptions) => {
      if (maxBufferBehind === prevOptions.maxBufferBehind) {
        return prevOptions;
      }
      return Object.assign({}, prevOptions, { maxBufferBehind });
    });
  }, [playerOptions]);

  const onMaxBufferAheadChange = useCallback((maxBufferAhead) => {
    updatePlayerOptions((prevOptions) => {
      if (maxBufferAhead === prevOptions.maxBufferAhead) {
        return prevOptions;
      }
      return Object.assign({}, prevOptions, { maxBufferAhead });
    });
  }, [playerOptions]);

  if (!showOptions) {
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
            onAutoPlayChange={onAutoPlayChange}
          />
        </Option>
        <Option title="Video adaptive settings">
          <VideoAdaptiveSettings
            defaultVideoRepresentationsSwitchingMode={
              defaultVideoRepresentationsSwitchingMode
            }
            limitVideoWidth={limitVideoWidth}
            throttleVideoBitrateWhenHidden={throttleVideoBitrateWhenHidden}
            onDefaultVideoRepresentationsSwitchingModeChange={
              onDefaultVideoRepresentationsSwitchingModeChange
            }
            onLimitVideoWidthChange={onLimitVideoWidthChange}
            onThrottleVideoBitrateWhenHiddenChange={
              onThrottleVideoBitrateWhenHiddenChange
            }
          />
        </Option>
        <Option title="Audio adaptive settings">
          <AudioAdaptiveSettings
            defaultAudioRepresentationsSwitchingMode={
              defaultAudioRepresentationsSwitchingMode
            }
            onDefaultAudioRepresentationsSwitchingModeChange={
              onDefaultAudioRepresentationsSwitchingModeChange
            }
          />
        </Option>
      </div>
      <div style={{ display: "flex" }}>
        <Option title="Request Configuration">
          <RequestConfig
            manifestRequestTimeout={manifestRequestTimeout}
            segmentRetry={segmentRetry}
            segmentRequestTimeout={segmentRequestTimeout}
            manifestRetry={manifestRetry}
            onSegmentRetryChange={onSegmentRetryChange}
            onSegmentRequestTimeoutChange={onSegmentRequestTimeoutChange}
            onManifestRetryChange={onManifestRetryChange}
            onManifestRequestTimeoutChange={onManifestRequestTimeoutChange}
          />
        </Option>
        <Option title="Track Switch Mode">
          <TrackSwitch
            defaultAudioTrackSwitchingMode={defaultAudioTrackSwitchingMode}
            enableFastSwitching={enableFastSwitching}
            onCodecSwitch={onCodecSwitch}
            onDefaultAudioTrackSwitchingModeChange={
              onDefaultAudioTrackSwitchingModeChange
            }
            onEnableFastSwitchingChange={onEnableFastSwitchingChange}
            onCodecSwitchChange={onCodecSwitchChange}
          />
        </Option>
        <Option title="Buffer Options">
          <BufferOptions
            wantedBufferAhead={wantedBufferAhead}
            maxVideoBufferSize={maxVideoBufferSize}
            maxBufferAhead={maxBufferAhead}
            maxBufferBehind={maxBufferBehind}
            onWantedBufferAheadChange={
              onWantedBufferAheadChange
            }
            onMaxBufferAheadChange={onMaxBufferAheadChange}
            onMaxBufferBehindChange={onMaxBufferBehindChange}
            onMaxVideoBufferSizeChange={
              onMaxVideoBufferSizeChange
            }
          />
        </Option>
      </div>
    </div>
  );
}

export default Settings;
