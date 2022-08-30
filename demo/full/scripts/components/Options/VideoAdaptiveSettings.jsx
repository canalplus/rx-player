import React, { Fragment, useState } from "react";

import getCheckBoxValue from "../../lib/getCheckboxValue";
import Checkbox from "../../components/CheckBox";
import Button from "../Button";
import DEFAULT_VALUES from "../../lib/defaultOptionsValues";

/**
 * @param {Object} props
 * @returns {Object}
 */
function VideoAdaptiveSettings({
  minVideoBr,
  maxVideoBr,
  onMinVideoBrInput,
  onMaxVideoBrInput,
  limitVideoWidth,
  throttleVideoBitrateWhenHidden,
  onLimitVideoWidthClick,
  onThrottleVideoBitrateWhenHiddenClick,
}) {
  const [isMinVideoBrLimited, setMinVideoBrLimit] = useState(minVideoBr !== 0);
  const [isMaxVideoBrLimited, setMaxVideoBrLimit] = useState(
    maxVideoBr !== Infinity
  );

  const onChangeLimitMinVideoBr = (evt) => {
    const isNotLimited = getCheckBoxValue(evt.target);
    if (isNotLimited) {
      setMinVideoBrLimit(false);
      onMinVideoBrInput(0);
    } else {
      setMinVideoBrLimit(true);
      onMinVideoBrInput(DEFAULT_VALUES.minVideoBr);
    }
  };

  const onChangeLimitMaxVideoBr = (evt) => {
    const isNotLimited = getCheckBoxValue(evt.target);
    if (isNotLimited) {
      setMaxVideoBrLimit(false);
      onMaxVideoBrInput(Infinity);
    } else {
      setMaxVideoBrLimit(true);
      onMaxVideoBrInput(DEFAULT_VALUES.maxVideoBr);
    }
  };

  return (
    <Fragment>
      <li>
        <div className="playerOptionInput">
          <label htmlFor="minVideoBitrate">Min Video Bitrate</label>
          <span className="wrapperInputWithResetBtn">
            <input
              type="number"
              name="minVideoBitrate"
              id="minVideoBitrate"
              aria-label="Min video bitrate option"
              placeholder="Number"
              onChange={(evt) => onMinVideoBrInput(evt.target.value)}
              value={minVideoBr}
              disabled={isMinVideoBrLimited === false}
              className="optionInput"
            />
            <Button
              className={
                parseInt(minVideoBr) === DEFAULT_VALUES.minVideoBr
                  ? "resetBtn disabledResetBtn"
                  : "resetBtn"
              }
              ariaLabel="Reset option to default value"
              title="Reset option to default value"
              onClick={() => {
                setMinVideoBrLimit(DEFAULT_VALUES.minVideoBr !== 0);
                onMinVideoBrInput(DEFAULT_VALUES.minVideoBr);
              }}
              value={String.fromCharCode(0xf021)}
            />
          </span>
        </div>
        <Checkbox
          className="playerOptionsCheckBox"
          ariaLabel="Min video bitrate limit"
          name="minVideoBitrateLimit"
          checked={isMinVideoBrLimited === false}
          onChange={onChangeLimitMinVideoBr}
        >
          Do not limit
        </Checkbox>
        <span className="option-desc">
          {
            !isMinVideoBrLimited || parseFloat(minVideoBr) <= 0 ?
              "Not limiting the lowest video bitrate reachable through the adaptive logic" :
              "Limiting the lowest video bitrate reachable through the adaptive " +
              `logic to ${minVideoBr} bits per seconds`
          }
        </span>
      </li>
      <li>
        <div className="playerOptionInput">
          <label htmlFor="maxVideoBitrate">Max Video Bitrate</label>
          <span className="wrapperInputWithResetBtn">
            <input
              type="text"
              name="maxVideoBitrate"
              id="maxVideoBitrate"
              aria-label="Max video bitrate option"
              placeholder="Number"
              onChange={(evt) => onMaxVideoBrInput(evt.target.value)}
              value={maxVideoBr}
              disabled={isMaxVideoBrLimited === false}
              className="optionInput"
            />
            <Button
              className={
                parseFloat(maxVideoBr) === DEFAULT_VALUES.maxVideoBr
                  ? "resetBtn disabledResetBtn"
                  : "resetBtn"
              }
              ariaLabel="Reset option to default value"
              title="Reset option to default value"
              onClick={() => {
                setMaxVideoBrLimit(DEFAULT_VALUES.maxVideoBr !== Infinity);
                onMaxVideoBrInput(DEFAULT_VALUES.maxVideoBr);
              }}
              value={String.fromCharCode(0xf021)}
            />
          </span>
        </div>
        <div>
          <Checkbox
            className="playerOptionsCheckBox"
            aria-label="Max video bitrate limit"
            name="maxVideoBitrateLimit"
            checked={isMaxVideoBrLimited === false}
            onChange={onChangeLimitMaxVideoBr}
          >
            Do not limit
          </Checkbox>
        </div>
        <span className="option-desc">
          {
            !isMaxVideoBrLimited || parseFloat(maxVideoBr) === Infinity ?
              "Not limiting the highest video bitrate reachable through the adaptive logic" :
              "Limiting the highest video bitrate reachable through the adaptive " +
              `logic to ${maxVideoBr} bits per seconds`
          }
        </span>
      </li>
      <li>
        <div>
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
