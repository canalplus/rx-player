import * as React from "react";
import {
  IVideoRepresentationsSwitchingMode,
} from "../../../../../src/public_types";
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
  limitVideoWidth,
  throttleVideoBitrateWhenHidden,
  onLimitVideoWidthChange,
  onThrottleVideoBitrateWhenHiddenChange,
}: {
  defaultVideoRepresentationsSwitchingMode: IVideoRepresentationsSwitchingMode;
  onDefaultVideoRepresentationsSwitchingModeChange: (
    mode: IVideoRepresentationsSwitchingMode
  ) => void;
  limitVideoWidth: boolean;
  throttleVideoBitrateWhenHidden: boolean;
  onLimitVideoWidthChange: (newVal: boolean) => void;
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
      defaultVideoRepresentationsSwitchingModeDescMsg =
        "Unknown value";
      break;
  }

  const onSwitchModeChange = React.useCallback(
    ({ value }: { value: string }) => {
      onDefaultVideoRepresentationsSwitchingModeChange(
        value as IVideoRepresentationsSwitchingMode
      );
    },
    [onDefaultVideoRepresentationsSwitchingModeChange]
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
        <div>
          <Checkbox
            className="playerOptionsCheckBox playerOptionsCheckBoxTitle"
            name="limitVideoWidth"
            ariaLabel="Limit video width option"
            checked={limitVideoWidth}
            onChange={onLimitVideoWidthChange}
          >
            Limit Video Width
          </Checkbox>
          <span className="option-desc">
            {limitVideoWidth ?
              "Limiting video width to the current <video> element's width" :
              "Not limiting video width to the current <video> element's width"}
          </span>
        </div>
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
            {throttleVideoBitrateWhenHidden ?
              "Throttling the video bitrate when the page is hidden for a time" :
              "Not throttling the video bitrate when the page is hidden for a time"}
          </span>
        </div>
      </li>
    </Fragment>
  );
}

export default React.memo(VideoAdaptiveSettings);
