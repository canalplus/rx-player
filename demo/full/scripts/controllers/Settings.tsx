import * as React from "react";
import Option from "../components/Options/Option";
import Playback from "../components/Options/Playback";
import AudioAdaptiveSettings from "../components/Options/AudioAdaptiveSettings";
import VideoAdaptiveSettings from "../components/Options/VideoAdaptiveSettings";
import NetworkConfig from "../components/Options/NetworkConfig";
import TrackSwitch from "../components/Options/TrackSwitch";
import BufferOptions from "../components/Options/BufferOptions";
import type {
  IConstructorSettings,
  ILoadVideoSettings,
} from "../lib/defaultOptionsValues";

const { useCallback } = React;

function Settings({
  playerOptions,
  updatePlayerOptions,
  loadVideoOptions,
  updateLoadVideoOptions,
  showOptions,
}: {
  playerOptions: IConstructorSettings;
  updatePlayerOptions: (
    cb: (previousOpts: IConstructorSettings) => IConstructorSettings
  ) => void;
  loadVideoOptions: ILoadVideoSettings;
  updateLoadVideoOptions: (
    cb: (previousOpts: ILoadVideoSettings) => ILoadVideoSettings
  ) => void;
  showOptions: boolean;
}): JSX.Element | null {
  const {
    limitVideoWidth,
    maxAudioBitrate,
    maxBufferAhead,
    maxBufferBehind,
    maxVideoBitrate,
    maxVideoBufferSize,
    minAudioBitrate,
    minVideoBitrate,
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

  const onAutoPlayChange = useCallback((autoPlay: boolean) => {
    updateLoadVideoOptions((prevOptions) => {
      if (autoPlay === prevOptions.autoPlay) {
        return prevOptions;
      }
      return Object.assign({}, prevOptions, { autoPlay });
    });
  }, [updateLoadVideoOptions]);

  const onMinVideoBitrateChange = useCallback((
    minVideoBitrate: number
  ) => {
    updatePlayerOptions((prevOptions) => {
      if (minVideoBitrate === prevOptions.minVideoBitrate) {
        return prevOptions;
      }
      return Object.assign({}, prevOptions, { minVideoBitrate });
    });
  }, [updatePlayerOptions]);

  const onMinAudioBitrateChange = useCallback((
    minAudioBitrate: number
  ) => {
    updatePlayerOptions((prevOptions) => {
      if (minAudioBitrate === prevOptions.minAudioBitrate) {
        return prevOptions;
      }
      return Object.assign({}, prevOptions, { minAudioBitrate });
    });
  }, [updatePlayerOptions]);

  const onMaxVideoBitrateChange = useCallback((maxVideoBitrate: number) => {
    updatePlayerOptions((prevOptions) => {
      if (maxVideoBitrate === prevOptions.maxVideoBitrate) {
        return prevOptions;
      }
      return Object.assign({}, prevOptions, { maxVideoBitrate });
    });
  }, [updatePlayerOptions]);

  const onMaxAudioBitrateChange = useCallback((maxAudioBitrate: number) => {
    updatePlayerOptions((prevOptions) => {
      if (maxAudioBitrate === prevOptions.maxAudioBitrate) {
        return prevOptions;
      }
      return Object.assign({}, prevOptions, { maxAudioBitrate });
    });
  }, [updatePlayerOptions]);

  const onLimitVideoWidthChange = useCallback((limitVideoWidth: boolean) => {
    updatePlayerOptions((prevOptions) => {
      if (limitVideoWidth === prevOptions.limitVideoWidth) {
        return prevOptions;
      }
      return Object.assign({}, prevOptions, { limitVideoWidth });
    });
  }, [updatePlayerOptions]);

  const onThrottleVideoBitrateWhenHiddenChange = useCallback((
    value: boolean
  ) => {
    updatePlayerOptions((prevOptions) => {
      if (value === prevOptions.throttleVideoBitrateWhenHidden) {
        return prevOptions;
      }
      return Object.assign({}, prevOptions, {
        throttleVideoBitrateWhenHidden: value,
      });
    });
  }, [updatePlayerOptions]);

  const onSegmentRetryChange = useCallback((segmentRetry: number) => {
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

  const onSegmentRequestTimeoutChange = useCallback((
    segmentRequestTimeout: number
  ) => {
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

  const onManifestRetryChange = useCallback((manifestRetry: number) => {
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

  const onOfflineRetryChange = useCallback((offlineRetry: number) => {
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
    (manifestRequestTimeout: number) => {
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

  const onEnableFastSwitchingChange = useCallback((
    enableFastSwitching: boolean
  ) => {
    updateLoadVideoOptions((prevOptions) => {
      if (enableFastSwitching === prevOptions.enableFastSwitching) {
        return prevOptions;
      }
      return Object.assign({}, prevOptions, { enableFastSwitching });
    });
  }, [updateLoadVideoOptions]);

  const onDefaultAudioTrackSwitchingModeChange = useCallback(
    (value: string) => {
      updateLoadVideoOptions((prevOptions) => {
        if (value === prevOptions.defaultAudioTrackSwitchingMode) {
          return prevOptions;
        }
        return Object.assign({}, prevOptions, {
          defaultAudioTrackSwitchingMode: value,
        });
      });
    },
    [updateLoadVideoOptions]
  );

  const onCodecSwitchChange = useCallback((value: string) => {
    updateLoadVideoOptions((prevOptions) => {
      if (value === prevOptions.onCodecSwitch) {
        return prevOptions;
      }
      return Object.assign({}, prevOptions, {
        onCodecSwitch: value,
      });
    });
  }, [updateLoadVideoOptions]);

  const onWantedBufferAheadChange = useCallback((wantedBufferAhead: number) => {
    updatePlayerOptions((prevOptions) => {
      if (wantedBufferAhead === prevOptions.wantedBufferAhead) {
        return prevOptions;
      }
      return Object.assign({}, prevOptions, { wantedBufferAhead });
    });
  }, [playerOptions]);

  const onMaxVideoBufferSizeChange = useCallback((
    maxVideoBufferSize: number
  ) => {
    updatePlayerOptions((prevOptions) => {
      if (maxVideoBufferSize === prevOptions.maxVideoBufferSize) {
        return prevOptions;
      }
      return Object.assign({}, prevOptions, { maxVideoBufferSize });
    });
  }, [playerOptions]);

  const onMaxBufferBehindChange = useCallback((maxBufferBehind: number) => {
    updatePlayerOptions((prevOptions) => {
      if (maxBufferBehind === prevOptions.maxBufferBehind) {
        return prevOptions;
      }
      return Object.assign({}, prevOptions, { maxBufferBehind });
    });
  }, [playerOptions]);

  const onMaxBufferAheadChange = useCallback((maxBufferAhead: number) => {
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
            minVideoBitrate={minVideoBitrate}
            maxVideoBitrate={maxVideoBitrate}
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
            minAudioBitrate={minAudioBitrate}
            maxAudioBitrate={maxAudioBitrate}
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
