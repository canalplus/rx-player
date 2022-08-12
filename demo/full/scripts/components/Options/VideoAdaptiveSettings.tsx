import * as React from "react";
import Checkbox from "../../components/CheckBox";

const { Fragment } = React;

/**
 * @param {Object} props
 * @returns {Object}
 */
function VideoAdaptiveSettings({
  limitVideoWidth,
  throttleVideoBitrateWhenHidden,
  onLimitVideoWidthChange,
  onThrottleVideoBitrateWhenHiddenChange,
}: {
  limitVideoWidth: boolean;
  throttleVideoBitrateWhenHidden: boolean;
  onLimitVideoWidthChange: (newVal: boolean) => void;
  onThrottleVideoBitrateWhenHiddenChange: (newVal: boolean) => void;
}): JSX.Element {
  return (
    <Fragment>
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
