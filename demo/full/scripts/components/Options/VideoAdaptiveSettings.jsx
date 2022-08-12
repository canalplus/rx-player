import React, { Fragment } from "react";
import Checkbox from "../../components/CheckBox";
import getCheckBoxValue from "../../lib/getCheckboxValue";

/**
 * @param {Object} props
 * @returns {Object}
 */
function VideoAdaptiveSettings({
  limitVideoWidth,
  throttleVideoBitrateWhenHidden,
  onLimitVideoWidthChange,
  onThrottleVideoBitrateWhenHiddenChange,
}) {
  return (
    <Fragment>
      <li>
        <div className="playerOptionInput">
          <Checkbox
            className="playerOptionsCheckBox playerOptionsCheckBoxTitle"
            name="limitVideoWidth"
            id="limitVideoWidth"
            ariaLabel="Limit video width option"
            checked={limitVideoWidth}
            onChange={(evt) => {
              onLimitVideoWidthChange(getCheckBoxValue(evt.target));
            }}
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
            onChange={(evt) => {
              onThrottleVideoBitrateWhenHiddenChange(
                getCheckBoxValue(evt.target)
              );
            }}
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
