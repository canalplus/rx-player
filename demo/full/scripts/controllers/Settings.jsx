import React, {useCallback} from "react";
import Option from "../components/Options/Option";
import Playback from "../components/Options/Playback.jsx";
import AudioAdaptiveSettings from "../components/Options/AudioAdaptiveSettings";
import VideoAdaptiveSettings from "../components/Options/VideoAdaptiveSettings.jsx";
import NetworkConfig from "../components/Options/NetworkConfig.jsx";
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
    defaultAudioTrackSwitchingMode,
    enableFastSwitching,
    networkConfig,
    onCodecSwitch,
  } = loadVideoOptions;
  const {
    segmentRetry,
    segmentRequestTimeout,
    manifestRetry,
    manifestRequestTimeout,
    offlineRetry,
  } = networkConfig;

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
      if (segmentRetry === prevOptions.networkConfig.segmentRetry) {
        return prevOptions;
      }
      return Object.assign({}, prevOptions, {
        networkConfig: Object.assign({}, prevOptions.networkConfig, {
          segmentRetry,
        }),
      });
    });
  }, [updateLoadVideoOptions]);

  const onSegmentRequestTimeoutChange = useCallback((segmentRequestTimeout) => {
    updateLoadVideoOptions((prevOptions) => {
      if (
        segmentRequestTimeout ===
          prevOptions.networkConfig.segmentRequestTimeout
      ) {
        return prevOptions;
      }
      return Object.assign({}, prevOptions, {
        networkConfig: Object.assign({}, prevOptions.networkConfig, {
          segmentRequestTimeout,
        }),
      });
    });
  }, [updateLoadVideoOptions]);

  const onManifestRetryChange = useCallback((manifestRetry) => {
    updateLoadVideoOptions((prevOptions) => {
      if (manifestRetry === prevOptions.networkConfig.manifestRetry) {
        return prevOptions;
      }
      return Object.assign({}, prevOptions, {
        networkConfig: Object.assign({}, prevOptions.networkConfig, {
          manifestRetry,
        }),
      });
    });
  }, [updateLoadVideoOptions]);

  const onOfflineRetryChange = useCallback((offlineRetry) => {
    updateLoadVideoOptions((prevOptions) => {
      if (offlineRetry === prevOptions.networkConfig.offlineRetry) {
        return prevOptions;
      }
      return Object.assign({}, prevOptions, {
        networkConfig: Object.assign({}, prevOptions.networkConfig, {
          offlineRetry,
        }),
      });
    });
  }, [updateLoadVideoOptions]);

  const onManifestRequestTimeoutChange = useCallback(
    (manifestRequestTimeout) => {
      updateLoadVideoOptions((prevOptions) => {
        if (
          manifestRequestTimeout ===
            prevOptions.networkConfig.manifestRequestTimeout
        ) {
          return prevOptions;
        }
        return Object.assign({}, prevOptions, {
          networkConfig: Object.assign({}, prevOptions.networkConfig, {
            manifestRequestTimeout,
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
            limitVideoWidth={limitVideoWidth}
            throttleVideoBitrateWhenHidden={throttleVideoBitrateWhenHidden}
            onLimitVideoWidthChange={onLimitVideoWidthChange}
            onThrottleVideoBitrateWhenHiddenChange={
              onThrottleVideoBitrateWhenHiddenChange
            }
          />
        </Option>
        <Option title="Audio adaptive settings">
          <AudioAdaptiveSettings />
        </Option>
      </div>
      <div style={{ display: "flex" }}>
        <Option title="Network Config">
          <NetworkConfig
            manifestRequestTimeout={manifestRequestTimeout}
            segmentRetry={segmentRetry}
            segmentRequestTimeout={segmentRequestTimeout}
            manifestRetry={manifestRetry}
            offlineRetry={offlineRetry}
            onSegmentRetryChange={onSegmentRetryChange}
            onSegmentRequestTimeoutChange={onSegmentRequestTimeoutChange}
            onManifestRetryChange={onManifestRetryChange}
            onManifestRequestTimeoutChange={onManifestRequestTimeoutChange}
            onOfflineRetryChange={onOfflineRetryChange}
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
