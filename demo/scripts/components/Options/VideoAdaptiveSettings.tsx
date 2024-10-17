import * as React from "react";
import { IVideoRepresentationsSwitchingMode } from "../../../../src/public_types";
import Checkbox from "../../components/CheckBox";
import Select from "../Select";

const { Fragment } = React;

/**
 * @param {Object} props
 * @returns {Object}
 */
function VideoAdaptiveSettings({
  defaultVideoRepresentationsSwitchingMode,
  onDefaultVideoRepresentationsSwitchingModeChange,
  videoResolutionLimit,
  throttleVideoBitrateWhenHidden,
  onVideoResolutionLimitChange,
  onThrottleVideoBitrateWhenHiddenChange,
}: {
  defaultVideoRepresentationsSwitchingMode: IVideoRepresentationsSwitchingMode;
  onDefaultVideoRepresentationsSwitchingModeChange: (
    mode: IVideoRepresentationsSwitchingMode,
  ) => void;
  videoResolutionLimit: "videoElement" | "screen" | "none";
  throttleVideoBitrateWhenHidden: boolean;
  onVideoResolutionLimitChange: (newVal: { index: number; value: string }) => void;
  onThrottleVideoBitrateWhenHiddenChange: (newVal: boolean) => void;
}): JSX.Element {
  let defaultVideoRepresentationsSwitchingModeDescMsg;
  switch (defaultVideoRepresentationsSwitchingMode) {
    case "reload":
      defaultVideoRepresentationsSwitchingModeDescMsg =
        "Reloading by default when video Representations are manually changed";
      break;
    case "lazy":
      defaultVideoRepresentationsSwitchingModeDescMsg =
        "Keeping previous data when video Representations are manually changed";
      break;
    case "direct":
      defaultVideoRepresentationsSwitchingModeDescMsg =
        "Directly visible transition when video Representations are manually changed";
      break;
    case "seamless":
      defaultVideoRepresentationsSwitchingModeDescMsg =
        "Smooth transition when video Representations are manually changed";
      break;
    default:
      defaultVideoRepresentationsSwitchingModeDescMsg = "Unknown value";
      break;
  }

  let videoResolutionLimitDescMsg;
  switch (videoResolutionLimit) {
    case "none":
      videoResolutionLimitDescMsg =
        "No limit on the video Representation’s resolution will be automatically applied.";
      break;
    case "screen":
      videoResolutionLimitDescMsg =
        "The loaded video Representation will be throttled according to the screen’s dimensions.";
      break;
    case "videoElement":
      videoResolutionLimitDescMsg =
        "The loaded video Representation will be throttled according to the given videoElement’s dimensions.";
      break;
  }

  const onSwitchModeChange = React.useCallback(
    ({ value }: { value: string }) => {
      onDefaultVideoRepresentationsSwitchingModeChange(
        value as IVideoRepresentationsSwitchingMode,
      );
    },
    [onDefaultVideoRepresentationsSwitchingModeChange],
  );
  return (
    <Fragment>
      <li className="featureWrapperWithSelectMode">
        <Select
          ariaLabel="Select the defaultVideoRepresentationsSwitchingMode"
          className="playerOptionInput"
          disabled={false}
          name="defaultVideoRepresentationsSwitchingMode"
          onChange={onSwitchModeChange}
          selected={{
            value: defaultVideoRepresentationsSwitchingMode,
            index: undefined,
          }}
          options={["seamless", "lazy", "direct", "reload"]}
        >
          Default Video Representations switching mode
        </Select>
        <span className="option-desc">
          {defaultVideoRepresentationsSwitchingModeDescMsg}
        </span>
      </li>
      <li>
        <Select
          ariaLabel="Select the videoResolutionLimit"
          className="playerOptionInput"
          disabled={false}
          name="videoResolutionLimit"
          onChange={onVideoResolutionLimitChange}
          selected={{
            value: videoResolutionLimit,
            index: undefined,
          }}
          options={["videoElement", "screen", "none"]}
        >
          Limit Video Resolution
        </Select>
        <span className="option-desc">{videoResolutionLimitDescMsg}</span>
      </li>
      <li>
        <div className="playerOptionInput">
          <Checkbox
            className="playerOptionsCheckBox playerOptionsCheckBoxTitle"
            name="throttleVideoBitrateWhenHidden"
            ariaLabel="Throttle video bitrate when hidden option"
            checked={throttleVideoBitrateWhenHidden}
            onChange={onThrottleVideoBitrateWhenHiddenChange}
          >
            Throttle Video Bitrate When Hidden
          </Checkbox>
          <span className="option-desc">
            {throttleVideoBitrateWhenHidden
              ? "Throttling the video bitrate when the page is hidden for a time"
              : "Not throttling the video bitrate when the page is hidden for a time"}
          </span>
        </div>
      </li>
    </Fragment>
  );
}

export default React.memo(VideoAdaptiveSettings);
