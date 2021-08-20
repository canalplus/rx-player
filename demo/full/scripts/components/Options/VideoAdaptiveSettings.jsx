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
  initialVideoBr,
  minVideoBr,
  maxVideoBr,
  onInitialVideoBrInput,
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
          <label htmlFor="initialVideoBitrate">Initial Video Bitrate</label>
          <span className="wrapperInputWithResetBtn">
            <input
              type="number"
              name="initialVideoBitrate"
              id="initialVideoBitrate"
              aria-label="Initial video bitrate option"
              placeholder="Number"
              onChange={(evt) => onInitialVideoBrInput(evt.target.value)}
              value={initialVideoBr}
              className="optionInput"
            />
            <Button
              className={
                parseFloat(initialVideoBr) === DEFAULT_VALUES.initialVideoBr
                  ? "resetBtn disabledResetBtn"
                  : "resetBtn"
              }
              ariaLabel="Reset option to default value"
              title="Reset option to default value"
              onClick={() => {
                onInitialVideoBrInput(DEFAULT_VALUES.initialVideoBr);
              }}
              value={String.fromCharCode(0xf021)}
            />
          </span>
        </div>
      </li>
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
      </li>
      <li>
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
      </li>
      <li>
        <Checkbox
          className="playerOptionsCheckBox playerOptionsCheckBoxTitle"
          name="throttleVideoBitrateWhenHidden"
          ariaLabel="Throttle video bitrate when hidden option"
          checked={throttleVideoBitrateWhenHidden}
          onChange={onThrottleVideoBitrateWhenHiddenClick}
        >
          Throttle Video Bitrate When Hidden
        </Checkbox>
      </li>
    </Fragment>
  );
}

export default React.memo(VideoAdaptiveSettings);
