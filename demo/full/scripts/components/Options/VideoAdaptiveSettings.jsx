import React, { Fragment } from "react";
import Select from "../Select";
import Checkbox from "../../components/CheckBox";

/**
 * @param {Object} props
 * @returns {Object}
 */
function VideoAdaptiveSettings({
  defaultVideoRepresentationsSwitchingMode,
  onDefaultVideoRepresentationsSwitchingModeChange,
  limitVideoWidth,
  throttleVideoBitrateWhenHidden,
  onLimitVideoWidthClick,
  onThrottleVideoBitrateWhenHiddenClick,
}) {
  return (
    <Fragment>
      <li className="featureWrapperWithSelectMode">
        <Select
          className="playerOptionInput"
          name="defaultVideoRepresentationsSwitchingMode"
          onChange={({ value }) =>
            onDefaultVideoRepresentationsSwitchingModeChange(value)}
          selected={{ value: defaultVideoRepresentationsSwitchingMode }}
          options={["seamless", "lazy", "direct", "reload"]}
        >
            Default Video Representations switching mode
        </Select>
      </li>
      <li>
        <div className="playerOptionInput">
          <Checkbox
            className="playerOptionsCheckBox playerOptionsCheckBoxTitle"
            name="limitVideoWidth"
            id="limitVideoWidth"
            ariaLabel="Limit video width option"
            checked={limitVideoWidth}
            onChange={onLimitVideoWidthClick}
          >
            Limit Video Width
          </Checkbox>
        </div>
        <span className="option-desc">
          {limitVideoWidth ?
            "Limiting video width to the current <video> element's width" :
            "Not limiting video width to the current <video> element's width"}
        </span>
      </li>
      <li>
        <div className="playerOptionInput">
          <Checkbox
            className="playerOptionsCheckBox playerOptionsCheckBoxTitle"
            name="throttleVideoBitrateWhenHidden"
            ariaLabel="Throttle video bitrate when hidden option"
            checked={throttleVideoBitrateWhenHidden}
            onChange={onThrottleVideoBitrateWhenHiddenClick}
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
