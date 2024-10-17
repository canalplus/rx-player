import * as React from "react";
import Option from "../components/Options/Option";
import Playback from "../components/Options/Playback";
import AudioAdaptiveSettings from "../components/Options/AudioAdaptiveSettings";
import VideoAdaptiveSettings from "../components/Options/VideoAdaptiveSettings";
import RequestConfig from "../components/Options/RequestConfig";
import TrackSwitch from "../components/Options/TrackSwitch";
import BufferOptions from "../components/Options/BufferOptions";
import type {
  IConstructorSettings,
  ILoadVideoSettings,
} from "../lib/defaultOptionsValues";
import type {
  IAudioRepresentationsSwitchingMode,
  ICmcdOptions,
  IVideoRepresentationsSwitchingMode,
} from "rx-player/types";

const { useCallback } = React;

function Settings({
  // TODO add to RxPlayer API?
  defaultAudioRepresentationsSwitchingMode,
  defaultVideoRepresentationsSwitchingMode,
  playerOptions,
  updatePlayerOptions,
  loadVideoOptions,
  updateLoadVideoOptions,
  showOptions,
  updateDefaultAudioRepresentationsSwitchingMode,
  updateDefaultVideoRepresentationsSwitchingMode,
  tryRelyOnWorker,
  updateTryRelyOnWorker,
}: {
  playerOptions: IConstructorSettings;
  updatePlayerOptions: (
    cb: (previousOpts: IConstructorSettings) => IConstructorSettings,
  ) => void;
  loadVideoOptions: ILoadVideoSettings;
  updateLoadVideoOptions: (
    cb: (previousOpts: ILoadVideoSettings) => ILoadVideoSettings,
  ) => void;
  defaultAudioRepresentationsSwitchingMode: IAudioRepresentationsSwitchingMode;
  defaultVideoRepresentationsSwitchingMode: IVideoRepresentationsSwitchingMode;
  updateDefaultAudioRepresentationsSwitchingMode: (
    mode: IAudioRepresentationsSwitchingMode,
  ) => void;
  updateDefaultVideoRepresentationsSwitchingMode: (
    mode: IVideoRepresentationsSwitchingMode,
  ) => void;
  tryRelyOnWorker: boolean;
  updateTryRelyOnWorker: (tryRelyOnWorker: boolean) => void;
  showOptions: boolean;
}): JSX.Element | null {
  const {
    videoResolutionLimit,
    maxBufferAhead,
    maxBufferBehind,
    maxVideoBufferSize,
    throttleVideoBitrateWhenHidden,
    wantedBufferAhead,
  } = playerOptions;
  const {
    autoPlay,
    cmcd,
    defaultAudioTrackSwitchingMode,
    enableFastSwitching,
    checkMediaSegmentIntegrity,
    checkManifestIntegrity,
    requestConfig,
    onCodecSwitch,
  } = loadVideoOptions;
  const cmcdCommunicationMethod = cmcd?.communicationType ?? "disabled";
  const { manifest: manifestRequestConfig, segment: segmentRequestConfig } =
    requestConfig;
  const { maxRetry: segmentRetry, timeout: segmentRequestTimeout } = segmentRequestConfig;
  const { maxRetry: manifestRetry, timeout: manifestRequestTimeout } =
    manifestRequestConfig;

  const onAutoPlayChange = useCallback(
    (autoPlay: boolean) => {
      updateLoadVideoOptions((prevOptions) => {
        if (autoPlay === prevOptions.autoPlay) {
          return prevOptions;
        }
        return Object.assign({}, prevOptions, { autoPlay });
      });
    },
    [updateLoadVideoOptions],
  );

  const onTryRelyOnWorkerChange = useCallback(
    (tryRelyOnWorker: boolean) => {
      updateTryRelyOnWorker(tryRelyOnWorker);
    },
    [updateTryRelyOnWorker],
  );

  const onCmcdChange = useCallback(
    (value: string) => {
      updateLoadVideoOptions((prevOptions) => {
        let newCmcdType: ICmcdOptions["communicationType"] | undefined;
        if (value === "query") {
          newCmcdType = "query";
        } else if (value === "headers") {
          newCmcdType = "headers";
        } else {
          newCmcdType = undefined;
        }
        if (newCmcdType === prevOptions.cmcd?.communicationType) {
          return prevOptions;
        }
        return Object.assign({}, prevOptions, {
          cmcd:
            newCmcdType === undefined
              ? undefined
              : {
                  communicationType: newCmcdType,
                },
        });
      });
    },
    [updateLoadVideoOptions],
  );

  const onVideoResolutionLimitChange = useCallback(
    (videoResolutionLimitArg: { value: string }) => {
      updatePlayerOptions((prevOptions) => {
        if (videoResolutionLimitArg.value === prevOptions.videoResolutionLimit) {
          return prevOptions;
        }
        return Object.assign({}, prevOptions, {
          videoResolutionLimit: videoResolutionLimitArg.value,
        });
      });
    },
    [updatePlayerOptions],
  );

  const onThrottleVideoBitrateWhenHiddenChange = useCallback(
    (value: boolean) => {
      updatePlayerOptions((prevOptions) => {
        if (value === prevOptions.throttleVideoBitrateWhenHidden) {
          return prevOptions;
        }
        return Object.assign({}, prevOptions, {
          throttleVideoBitrateWhenHidden: value,
        });
      });
    },
    [updatePlayerOptions],
  );

  const onSegmentRetryChange = useCallback(
    (segmentRetry: number) => {
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
    },
    [updateLoadVideoOptions],
  );

  const onSegmentRequestTimeoutChange = useCallback(
    (segmentRequestTimeout: number) => {
      updateLoadVideoOptions((prevOptions) => {
        if (segmentRequestTimeout === prevOptions.requestConfig.segment.timeout) {
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
    },
    [updateLoadVideoOptions],
  );

  const onManifestRetryChange = useCallback(
    (manifestRetry: number) => {
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
    },
    [updateLoadVideoOptions],
  );

  const onManifestRequestTimeoutChange = useCallback(
    (manifestRequestTimeout: number) => {
      updateLoadVideoOptions((prevOptions) => {
        if (manifestRequestTimeout === prevOptions.requestConfig.manifest.timeout) {
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
    [updateLoadVideoOptions],
  );

  const onCheckMediaSegmentIntegrityChange = useCallback(
    (checkMediaSegmentIntegrity: boolean) => {
      updateLoadVideoOptions((prevOptions) => {
        if (checkMediaSegmentIntegrity === prevOptions.checkMediaSegmentIntegrity) {
          return prevOptions;
        }
        return Object.assign({}, prevOptions, { checkMediaSegmentIntegrity });
      });
    },
    [updateLoadVideoOptions],
  );

  const onCheckManifestIntegrityChange = useCallback(
    (checkManifestIntegrity: boolean) => {
      updateLoadVideoOptions((prevOptions) => {
        if (checkManifestIntegrity === prevOptions.checkManifestIntegrity) {
          return prevOptions;
        }
        return Object.assign({}, prevOptions, { checkManifestIntegrity });
      });
    },
    [updateLoadVideoOptions],
  );

  const onEnableFastSwitchingChange = useCallback(
    (enableFastSwitching: boolean) => {
      updateLoadVideoOptions((prevOptions) => {
        if (enableFastSwitching === prevOptions.enableFastSwitching) {
          return prevOptions;
        }
        return Object.assign({}, prevOptions, { enableFastSwitching });
      });
    },
    [updateLoadVideoOptions],
  );

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
    [updateLoadVideoOptions],
  );

  const onDefaultVideoRepresentationsSwitchingModeChange = useCallback(
    (value: IVideoRepresentationsSwitchingMode) => {
      updateDefaultVideoRepresentationsSwitchingMode(value);
    },
    [updateLoadVideoOptions],
  );

  const onDefaultAudioRepresentationsSwitchingModeChange = useCallback(
    (value: IAudioRepresentationsSwitchingMode) => {
      updateDefaultAudioRepresentationsSwitchingMode(value);
    },
    [updateLoadVideoOptions],
  );

  const onCodecSwitchChange = useCallback(
    (value: string) => {
      updateLoadVideoOptions((prevOptions) => {
        if (value === prevOptions.onCodecSwitch) {
          return prevOptions;
        }
        return Object.assign({}, prevOptions, {
          onCodecSwitch: value,
        });
      });
    },
    [updateLoadVideoOptions],
  );

  const onWantedBufferAheadChange = useCallback(
    (wantedBufferAhead: number) => {
      updatePlayerOptions((prevOptions) => {
        if (wantedBufferAhead === prevOptions.wantedBufferAhead) {
          return prevOptions;
        }
        return Object.assign({}, prevOptions, { wantedBufferAhead });
      });
    },
    [playerOptions],
  );

  const onMaxVideoBufferSizeChange = useCallback(
    (maxVideoBufferSize: number) => {
      updatePlayerOptions((prevOptions) => {
        if (maxVideoBufferSize === prevOptions.maxVideoBufferSize) {
          return prevOptions;
        }
        return Object.assign({}, prevOptions, { maxVideoBufferSize });
      });
    },
    [playerOptions],
  );

  const onMaxBufferBehindChange = useCallback(
    (maxBufferBehind: number) => {
      updatePlayerOptions((prevOptions) => {
        if (maxBufferBehind === prevOptions.maxBufferBehind) {
          return prevOptions;
        }
        return Object.assign({}, prevOptions, { maxBufferBehind });
      });
    },
    [playerOptions],
  );

  const onMaxBufferAheadChange = useCallback(
    (maxBufferAhead: number) => {
      updatePlayerOptions((prevOptions) => {
        if (maxBufferAhead === prevOptions.maxBufferAhead) {
          return prevOptions;
        }
        return Object.assign({}, prevOptions, { maxBufferAhead });
      });
    },
    [playerOptions],
  );

  if (!showOptions) {
    return null;
  }

  return (
    <div className="settingsWrapper">
      <div className="settings-title">Content options</div>
      <div className="settings-note">
        Note: Those options won't be retroactively applied to already-loaded contents
      </div>
      <div style={{ display: "flex" }}>
        <Option title="Playback">
          <Playback
            autoPlay={autoPlay}
            onAutoPlayChange={onAutoPlayChange}
            tryRelyOnWorker={tryRelyOnWorker}
            onTryRelyOnWorkerChange={onTryRelyOnWorkerChange}
          />
        </Option>
        <Option title="Video adaptive settings">
          <VideoAdaptiveSettings
            defaultVideoRepresentationsSwitchingMode={
              defaultVideoRepresentationsSwitchingMode
            }
            videoResolutionLimit={videoResolutionLimit}
            throttleVideoBitrateWhenHidden={throttleVideoBitrateWhenHidden}
            onDefaultVideoRepresentationsSwitchingModeChange={
              onDefaultVideoRepresentationsSwitchingModeChange
            }
            onVideoResolutionLimitChange={onVideoResolutionLimitChange}
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
            checkManifestIntegrity={checkManifestIntegrity}
            checkMediaSegmentIntegrity={checkMediaSegmentIntegrity}
            cmcdCommunicationMethod={cmcdCommunicationMethod}
            onSegmentRetryChange={onSegmentRetryChange}
            onSegmentRequestTimeoutChange={onSegmentRequestTimeoutChange}
            onManifestRetryChange={onManifestRetryChange}
            onManifestRequestTimeoutChange={onManifestRequestTimeoutChange}
            onCheckManifestIntegrityChange={onCheckManifestIntegrityChange}
            onCheckMediaSegmentIntegrityChange={onCheckMediaSegmentIntegrityChange}
            onCmcdChange={onCmcdChange}
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
            onWantedBufferAheadChange={onWantedBufferAheadChange}
            onMaxBufferAheadChange={onMaxBufferAheadChange}
            onMaxBufferBehindChange={onMaxBufferBehindChange}
            onMaxVideoBufferSizeChange={onMaxVideoBufferSizeChange}
          />
        </Option>
      </div>
    </div>
  );
}

export default Settings;
