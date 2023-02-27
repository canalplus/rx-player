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
  initialVideoBitrate,
  minVideoBitrate,
  maxVideoBitrate,
  onInitialVideoBitrateChange,
  onMinVideoBitrateChange,
  onMaxVideoBitrateChange,
  limitVideoWidth,
  throttleVideoBitrateWhenHidden,
  onLimitVideoWidthChange,
  onThrottleVideoBitrateWhenHiddenChange,
}) {
  const [initialVideoBitrateTxt, updateInitialVideoBitrateText] = useState(
    initialVideoBitrate
  );
  const [minVideoBitrateTxt, updateMinVideoBitrateText] = useState(
    minVideoBitrate
  );
  const [maxVideoBitrateTxt, updateMaxVideoBitrateText] = useState(
    maxVideoBitrate
  );
  const [isMinVideoBitrateLimited, setMinVideoBitrateLimit] = useState(
    minVideoBitrate !== 0
  );
  const [isMaxVideoBitrateLimited, setMaxVideoBitrateLimit] = useState(
    maxVideoBitrate !== Infinity
  );

  const defaultInitialVideoBitrate = DEFAULT_VALUES.player.initialVideoBitrate;
  const defaultMinVideoBitrate = DEFAULT_VALUES.player.minVideoBitrate;
  const defaultMaxVideoBitrate = DEFAULT_VALUES.player.maxVideoBitrate;

  const onChangeLimitMinVideoBitrate = (evt) => {
    const isNotLimited = getCheckBoxValue(evt.target);
    if (isNotLimited) {
      setMinVideoBitrateLimit(false);
      updateMinVideoBitrateText(String(0));
      onMinVideoBitrateChange(0);
    } else {
      setMinVideoBitrateLimit(true);
      updateMinVideoBitrateText(String(defaultMinVideoBitrate));
      onMinVideoBitrateChange(defaultMinVideoBitrate);
    }
  };

  const onChangeLimitMaxVideoBitrate = (evt) => {
    const isNotLimited = getCheckBoxValue(evt.target);
    if (isNotLimited) {
      setMaxVideoBitrateLimit(false);
      updateMaxVideoBitrateText(String(Infinity));
      onMaxVideoBitrateChange(Infinity);
    } else {
      setMaxVideoBitrateLimit(true);
      updateMaxVideoBitrateText(String(defaultMaxVideoBitrate));
      onMaxVideoBitrateChange(defaultMaxVideoBitrate);
    }
  };

  return (
    <Fragment>
      <li>
        <div className="playerOptionInput">
          <label htmlFor="initialVideoBitrate">Initial Video Bitrate</label>
          <span className="wrapperInputWithResetBtn">
            <input
              type="text"
              name="initialVideoBitrate"
              id="initialVideoBitrate"
              aria-label="Initial video bitrate option"
              placeholder="Number"
              onChange={(evt) => {
                const { value } = evt.target;
                updateInitialVideoBitrateText(value);
                let newBitrate = value === "" ?
                  defaultInitialVideoBitrate :
                  parseFloat(value);
                newBitrate = isNaN(newBitrate) ?
                  defaultInitialVideoBitrate :
                  newBitrate;
                onInitialVideoBitrateChange(newBitrate);
              }}
              value={initialVideoBitrateTxt}
              className="optionInput"
            />
            <Button
              className={
                parseFloat(
                  initialVideoBitrateTxt
                ) === defaultInitialVideoBitrate
                  ? "resetBtn disabledResetBtn"
                  : "resetBtn"
              }
              ariaLabel="Reset option to default value"
              title="Reset option to default value"
              onClick={() => {
                updateInitialVideoBitrateText(String(
                  defaultInitialVideoBitrate
                ));
                onInitialVideoBitrateChange(defaultInitialVideoBitrate);
              }}
              value={String.fromCharCode(0xf021)}
            />
          </span>
        </div>
        <span className="option-desc">
          {
            initialVideoBitrate === 0 ?
              "Starts loading the lowest video bitrate" :
              `Starts with a video bandwidth estimate of ${initialVideoBitrate}` +
              " bits per seconds."
          }
        </span>
      </li>
      <li>
        <div className="playerOptionInput">
          <label htmlFor="minVideoBitrate">Min Video Bitrate</label>
          <span className="wrapperInputWithResetBtn">
            <input
              type="text"
              name="minVideoBitrate"
              id="minVideoBitrate"
              aria-label="Min video bitrate option"
              placeholder="Number"
              onChange={(evt) => {
                const { value } = evt.target;
                updateMinVideoBitrateText(value);
                let newBitrate = value === "" ?
                  defaultMinVideoBitrate :
                  parseFloat(value);
                newBitrate = isNaN(newBitrate) ?
                  defaultMinVideoBitrate :
                  newBitrate;
                onMinVideoBitrateChange(newBitrate);
              }}
              value={minVideoBitrateTxt}
              disabled={isMinVideoBitrateLimited === false}
              className="optionInput"
            />
            <Button
              className={
                parseFloat(minVideoBitrateTxt) === defaultMinVideoBitrate
                  ? "resetBtn disabledResetBtn"
                  : "resetBtn"
              }
              ariaLabel="Reset option to default value"
              title="Reset option to default value"
              onClick={() => {
                updateMinVideoBitrateText(String(defaultMinVideoBitrate));
                onMinVideoBitrateChange(defaultMinVideoBitrate);
                setMinVideoBitrateLimit(defaultMinVideoBitrate !== 0);
              }}
              value={String.fromCharCode(0xf021)}
            />
          </span>
        </div>
        <Checkbox
          className="playerOptionsCheckBox"
          ariaLabel="Min video bitrate limit"
          name="minVideoBitrateLimit"
          checked={isMinVideoBitrateLimited === false}
          onChange={onChangeLimitMinVideoBitrate}
        >
          Do not limit
        </Checkbox>
        <span className="option-desc">
          {
            !isMinVideoBitrateLimited || minVideoBitrate <= 0 ?
              "Not limiting the lowest video bitrate reachable through the adaptive logic" :
              "Limiting the lowest video bitrate reachable through the adaptive " +
              `logic to ${minVideoBitrate} bits per seconds`
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
              onChange={(evt) => {
                const { value } = evt.target;
                updateMaxVideoBitrateText(value);
                let newBitrate = value === "" ?
                  defaultMaxVideoBitrate :
                  parseFloat(value);
                newBitrate = isNaN(newBitrate) ?
                  defaultMaxVideoBitrate :
                  newBitrate;
                onMaxVideoBitrateChange(newBitrate);
              }}
              value={maxVideoBitrateTxt}
              disabled={isMaxVideoBitrateLimited === false}
              className="optionInput"
            />
            <Button
              className={
                parseFloat(maxVideoBitrateTxt) === defaultMaxVideoBitrate
                  ? "resetBtn disabledResetBtn"
                  : "resetBtn"
              }
              ariaLabel="Reset option to default value"
              title="Reset option to default value"
              onClick={() => {
                updateMaxVideoBitrateText(String(defaultMaxVideoBitrate));
                onMaxVideoBitrateChange(defaultMaxVideoBitrate);
                setMaxVideoBitrateLimit(defaultMaxVideoBitrate !== Infinity);
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
            checked={isMaxVideoBitrateLimited === false}
            onChange={onChangeLimitMaxVideoBitrate}
          >
            Do not limit
          </Checkbox>
        </div>
        <span className="option-desc">
          {
            !isMaxVideoBitrateLimited ||
            parseFloat(maxVideoBitrate) === Infinity ?
              "Not limiting the highest video bitrate reachable through the adaptive logic" :
              "Limiting the highest video bitrate reachable through the adaptive " +
              `logic to ${maxVideoBitrate} bits per seconds`
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
            onChange={(evt) => {
              onLimitVideoWidthChange(getCheckBoxValue(evt.target));
            }}
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
