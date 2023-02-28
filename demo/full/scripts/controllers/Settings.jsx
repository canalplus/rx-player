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
    initialAudioBitrate,
    initialVideoBitrate,
    limitVideoWidth,
    maxAudioBitrate,
    maxBufferAhead,
    maxBufferBehind,
    maxVideoBitrate,
    maxVideoBufferSize,
    minAudioBitrate,
    minVideoBitrate,
    stopAtEnd,
    throttleVideoBitrateWhenHidden,
    wantedBufferAhead,
  } = playerOptions;
  const {
    audioTrackSwitchingMode,
    autoPlay,
    enableFastSwitching,
    manualBitrateSwitchingMode,
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

  if (!showOptions) {
    return null;
  }

  const onAutoPlayChange = useCallback((autoPlay) => {
    updateLoadVideoOptions((prevOptions) => {
      if (autoPlay === prevOptions.autoPlay) {
        return prevOptions;
      }
      return Object.assign({}, prevOptions, { autoPlay });
    });
  }, [updateLoadVideoOptions]);

  const onManualBitrateSwitchingModeChange = useCallback((value) => {
    updateLoadVideoOptions((prevOptions) => {
      if (value === prevOptions.manualBitrateSwitchingMode) {
        return prevOptions;
      }
      return Object.assign({}, prevOptions, {
        manualBitrateSwitchingMode: value,
      });
    });
  }, [updateLoadVideoOptions]);

  const onStopAtEndChange = useCallback((stopAtEnd) => {
    updatePlayerOptions((prevOptions) => {
      if (stopAtEnd === prevOptions.stopAtEnd) {
        return prevOptions;
      }
      return Object.assign({}, prevOptions, { stopAtEnd });
    });
  }, [updatePlayerOptions]);

  const onInitialVideoBitrateChange = useCallback((initialVideoBitrate)  => {
    updatePlayerOptions((prevOptions) => {
      if (initialVideoBitrate === prevOptions.initialVideoBitrate) {
        return prevOptions;
      }
      return Object.assign({}, prevOptions, { initialVideoBitrate });
    });
  }, [updatePlayerOptions]);

  const onInitialAudioBitrateChange = useCallback((initialAudioBitrate) => {
    updatePlayerOptions((prevOptions) => {
      if (initialAudioBitrate === prevOptions.initialAudioBitrate) {
        return prevOptions;
      }
      return Object.assign({}, prevOptions, { initialAudioBitrate });
    });
  }, [updatePlayerOptions]);

  const onMinVideoBitrateChange = useCallback((minVideoBitrate) => {
    updatePlayerOptions((prevOptions) => {
      if (minVideoBitrate === prevOptions.minVideoBitrate) {
        return prevOptions;
      }
      return Object.assign({}, prevOptions, { minVideoBitrate });
    });
  }, [updatePlayerOptions]);

  const onMinAudioBitrateChange = useCallback((minAudioBitrate) => {
    updatePlayerOptions((prevOptions) => {
      if (minAudioBitrate === prevOptions.minAudioBitrate) {
        return prevOptions;
      }
      return Object.assign({}, prevOptions, { minAudioBitrate });
    });
  }, [updatePlayerOptions]);

  const onMaxVideoBitrateChange = useCallback((maxVideoBitrate) => {
    updatePlayerOptions((prevOptions) => {
      if (maxVideoBitrate === prevOptions.maxVideoBitrate) {
        return prevOptions;
      }
      return Object.assign({}, prevOptions, { maxVideoBitrate });
    });
  }, [updatePlayerOptions]);

  const onMaxAudioBitrateChange = useCallback((maxAudioBitrate) => {
    updatePlayerOptions((prevOptions) => {
      if (maxAudioBitrate === prevOptions.maxAudioBitrate) {
        return prevOptions;
      }
      return Object.assign({}, prevOptions, { maxAudioBitrate });
    });
  }, [updatePlayerOptions]);

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

  const onAudioTrackSwitchingModeChange = useCallback((value) => {
    updateLoadVideoOptions((prevOptions) => {
      if (value === prevOptions.audioTrackSwitchingMode) {
        return prevOptions;
      }
      return Object.assign({}, prevOptions, {
        audioTrackSwitchingMode: value,
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
            manualBitrateSwitchingMode={manualBitrateSwitchingMode}
            onAutoPlayChange={onAutoPlayChange}
            onManualBitrateSwitchingModeChange={
              onManualBitrateSwitchingModeChange
            }
            stopAtEnd={stopAtEnd}
            onStopAtEndChange={onStopAtEndChange}
          />
        </Option>
        <Option title="Video adaptive settings">
          <VideoAdaptiveSettings
            initialVideoBitrate={initialVideoBitrate}
            minVideoBitrate={minVideoBitrate}
            maxVideoBitrate={maxVideoBitrate}
            onInitialVideoBitrateChange={onInitialVideoBitrateChange}
            onMinVideoBitrateChange={onMinVideoBitrateChange}
            onMaxVideoBitrateChange={onMaxVideoBitrateChange}
            limitVideoWidth={limitVideoWidth}
            throttleVideoBitrateWhenHidden={throttleVideoBitrateWhenHidden}
            onLimitVideoWidthChange={onLimitVideoWidthChange}
            onThrottleVideoBitrateWhenHiddenChange={
              onThrottleVideoBitrateWhenHiddenChange
            }
          />
        </Option>
        <Option title="Audio adaptive settings">
          <AudioAdaptiveSettings
            initialAudioBitrate={initialAudioBitrate}
            minAudioBitrate={minAudioBitrate}
            maxAudioBitrate={maxAudioBitrate}
            onInitialAudioBitrateChange={onInitialAudioBitrateChange}
            onMinAudioBitrateChange={onMinAudioBitrateChange}
            onMaxAudioBitrateChange={onMaxAudioBitrateChange}
          />
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
            enableFastSwitching={enableFastSwitching}
            audioTrackSwitchingMode={audioTrackSwitchingMode}
            onCodecSwitch={onCodecSwitch}
            onEnableFastSwitchingChange={onEnableFastSwitchingChange}
            onAudioTrackSwitchingModeChange={onAudioTrackSwitchingModeChange}
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
