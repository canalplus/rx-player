import React, { Fragment } from "react";

import Checkbox from "../../components/CheckBox";

/**
 * @param {Object} props
 * @returns {Object}
 */
function VideoAdaptiveSettings({
  limitVideoWidth,
  throttleVideoBitrateWhenHidden,
  onLimitVideoWidthClick,
  onThrottleVideoBitrateWhenHiddenClick,
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
            onChange={onLimitVideoWidthClick}
          >
            Limit Video Width
          </Checkbox>
        </div>
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
        </div>
      </li>
    </Fragment>
  );
}

export default React.memo(VideoAdaptiveSettings);
