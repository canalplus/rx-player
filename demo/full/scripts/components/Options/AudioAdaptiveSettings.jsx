import React, { Fragment, useState } from "react";

import getCheckBoxValue from "../../lib/getCheckboxValue";
import Checkbox from "../../components/CheckBox";
import Button from "../Button";
import DEFAULT_VALUES from "../../lib/defaultOptionsValues";

/**
 * @param {Object} props
 * @returns {Object}
 */
function AudioAdaptiveSettings({
  minAudioBr,
  maxAudioBr,
  onMinAudioBrInput,
  onMaxAudioBrInput,
}) {
  const [isMinAudioBrLimited, setMinAudioBrLimit] = useState(minAudioBr !== 0);
  const [isMaxAudioBrLimited, setMaxAudioBrLimit] = useState(
    maxAudioBr !== Infinity
  );

  const onChangeLimitMinAudioBr = (evt) => {
    const isNotLimited = getCheckBoxValue(evt.target);
    if (isNotLimited) {
      setMinAudioBrLimit(false);
      onMinAudioBrInput(0);
    } else {
      setMinAudioBrLimit(true);
      onMinAudioBrInput(DEFAULT_VALUES.minAudioBr);
    }
  };

  const onChangeLimitMaxAudioBr = (evt) => {
    const isNotLimited = getCheckBoxValue(evt.target);
    if (isNotLimited) {
      setMaxAudioBrLimit(false);
      onMaxAudioBrInput(Infinity);
    } else {
      setMaxAudioBrLimit(true);
      onMaxAudioBrInput(DEFAULT_VALUES.maxAudioBr);
    }
  };

  return (
    <Fragment>
      <li>
        <div className="playerOptionInput">
          <label htmlFor="minAudioBitrate">Min Audio Bitrate</label>
          <span className="wrapperInputWithResetBtn">
            <input
              type="number"
              name="minAudioBitrate"
              id="minAudioBitrate"
              aria-label="Min audio bitrate option"
              placeholder="Number"
              onChange={(evt) => onMinAudioBrInput(evt.target.value)}
              value={minAudioBr}
              disabled={isMinAudioBrLimited === false}
              className="optionInput"
            />
            <Button
              className={
                parseFloat(minAudioBr) === DEFAULT_VALUES.minAudioBr
                  ? "resetBtn disabledResetBtn"
                  : "resetBtn"
              }
              ariaLabel="Reset option to default value"
              title="Reset option to default value"
              onClick={() => {
                setMinAudioBrLimit(DEFAULT_VALUES.minAudioBr !== 0);
                onMinAudioBrInput(DEFAULT_VALUES.minAudioBr);
              }}
              value={String.fromCharCode(0xf021)}
            />
          </span>
        </div>
        <Checkbox
          className="playerOptionsCheckBox"
          ariaLabel="Min video bitrate limit"
          name="minAudioBitrateLimit"
          checked={isMinAudioBrLimited === false}
          onChange={onChangeLimitMinAudioBr}
        >
          Do not limit
        </Checkbox>
        <span className="option-desc">
          {
            !isMinAudioBrLimited || parseFloat(minAudioBr) <= 0 ?
              "Not limiting the lowest audio bitrate reachable through the adaptive logic" :
              "Limiting the lowest audio bitrate reachable through the adaptive " +
              `logic to ${minAudioBr} bits per seconds`
          }
        </span>
      </li>
      <li>
        <div className="playerOptionInput">
          <label htmlFor="maxAudioBitrate">Max Audio Bitrate</label>
          <span className="wrapperInputWithResetBtn">
            <input
              type="text"
              name="maxAudioBitrate"
              id="maxAudioBitrate"
              aria-label="Max audio bitrate"
              placeholder="Number"
              onChange={(evt) => onMaxAudioBrInput(evt.target.value)}
              value={String(maxAudioBr)}
              disabled={isMaxAudioBrLimited === false}
              className="optionInput"
            />
            <Button
              className={
                parseFloat(maxAudioBr) === DEFAULT_VALUES.maxAudioBr
                  ? "resetBtn disabledResetBtn"
                  : "resetBtn"
              }
              ariaLabel="Reset option to default value"
              title="Reset option to default value"
              onClick={() => {
                setMaxAudioBrLimit(DEFAULT_VALUES.maxAudioBr !== Infinity);
                onMaxAudioBrInput(DEFAULT_VALUES.maxAudioBr);
              }}
              value={String.fromCharCode(0xf021)}
            />
          </span>
        </div>
        <div>
          <Checkbox
            className="playerOptionsCheckBox"
            ariaLabel="Max audio bitrate limit"
            name="maxAudioBitrateLimit"
            checked={isMaxAudioBrLimited === false}
            onChange={onChangeLimitMaxAudioBr}
          >
            Do not limit
          </Checkbox>
        </div>
        <span className="option-desc">
          {
            !isMaxAudioBrLimited || parseFloat(maxAudioBr) === Infinity ?
              "Not limiting the highest audio bitrate reachable through the adaptive logic" :
              "Limiting the highest audio bitrate reachable through the adaptive " +
              `logic to ${maxAudioBr} bits per seconds`
          }
        </span>
      </li>
    </Fragment>
  );
}

export default React.memo(AudioAdaptiveSettings);
