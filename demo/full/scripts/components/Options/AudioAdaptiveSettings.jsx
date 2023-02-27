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
  initialAudioBitrate,
  minAudioBitrate,
  maxAudioBitrate,
  onInitialAudioBitrateChange,
  onMinAudioBitrateChange,
  onMaxAudioBitrateChange,
}) {
  const [initialAudioBitrateTxt, updateInitialAudioBitrateText] = useState(
    initialAudioBitrate
  );
  const [minAudioBitrateTxt, updateMinAudioBitrateText] = useState(
    minAudioBitrate
  );
  const [maxAudioBitrateTxt, updateMaxAudioBitrateText] = useState(
    maxAudioBitrate
  );
  const [isMinAudioBitrateLimited, setMinAudioBitrateLimit] = useState(
    minAudioBitrate !== 0
  );
  const [isMaxAudioBitrateLimited, setMaxAudioBitrateLimit] = useState(
    maxAudioBitrate !== Infinity
  );

  const defaultInitialAudioBitrate = DEFAULT_VALUES.player.initialAudioBitrate;
  const defaultMinAudioBitrate = DEFAULT_VALUES.player.minAudioBitrate;
  const defaultMaxAudioBitrate = DEFAULT_VALUES.player.maxAudioBitrate;

  const onChangeLimitMinAudioBitrate = (evt) => {
    const isNotLimited = getCheckBoxValue(evt.target);
    if (isNotLimited) {
      setMinAudioBitrateLimit(false);
      updateMinAudioBitrateText(String(0));
      onMinAudioBitrateChange(0);
    } else {
      setMinAudioBitrateLimit(true);
      updateMinAudioBitrateText(String(defaultMinAudioBitrate));
      onMinAudioBitrateChange(defaultMinAudioBitrate);
    }
  };

  const onChangeLimitMaxAudioBitrate = (evt) => {
    const isNotLimited = getCheckBoxValue(evt.target);
    if (isNotLimited) {
      setMaxAudioBitrateLimit(false);
      updateMaxAudioBitrateText(String(Infinity));
      onMaxAudioBitrateChange(Infinity);
    } else {
      setMaxAudioBitrateLimit(true);
      updateMaxAudioBitrateText(String(defaultMaxAudioBitrate));
      onMaxAudioBitrateChange(defaultMaxAudioBitrate);
    }
  };

  return (
    <Fragment>
      <li>
        <div className="playerOptionInput">
          <label htmlFor="initialAudioBitrate">Initial Audio Bitrate</label>
          <span className="wrapperInputWithResetBtn">
            <input
              type="text"
              name="initialAudioBitrate"
              id="initialAudioBitrate"
              aria-label="Initial audio bitrate option"
              placeholder="Number"
              onChange={(evt) => {
                const { value } = evt.target;
                updateInitialAudioBitrateText(value);
                let newBitrate = value === "" ?
                  defaultInitialAudioBitrate :
                  parseFloat(value);
                newBitrate = isNaN(newBitrate) ?
                  defaultInitialAudioBitrate :
                  newBitrate;
                onInitialAudioBitrateChange(newBitrate);
              }}
              value={initialAudioBitrateTxt}
              className="optionInput"
            />
            <Button
              className={
                parseFloat(
                  initialAudioBitrateTxt
                ) === defaultInitialAudioBitrate
                  ? "resetBtn disabledResetBtn"
                  : "resetBtn"
              }
              ariaLabel="Reset option to default value"
              title="Reset option to default value"
              onClick={() => {
                updateInitialAudioBitrateText(String(
                  defaultInitialAudioBitrate
                ));
                onInitialAudioBitrateChange(defaultInitialAudioBitrate);
              }}
              value={String.fromCharCode(0xf021)}
            />
          </span>
        </div>
        <span className="option-desc">
          {
            initialAudioBitrate === 0 ?
              "Starts loading the lowest audio bitrate" :
              `Starts with an audio bandwidth estimate of ${initialAudioBitrate}` +
              " bits per seconds."
          }
        </span>
      </li>
      <li>
        <div className="playerOptionInput">
          <label htmlFor="minAudioBitrate">Min Audio Bitrate</label>
          <span className="wrapperInputWithResetBtn">
            <input
              type="text"
              name="minAudioBitrate"
              id="minAudioBitrate"
              aria-label="Min audio bitrate option"
              placeholder="Number"
              onChange={(evt) => {
                const { value } = evt.target;
                updateMinAudioBitrateText(value);
                let newBitrate = value === "" ?
                  defaultMinAudioBitrate :
                  parseFloat(value);
                newBitrate = isNaN(newBitrate) ?
                  defaultMinAudioBitrate :
                  newBitrate;
                onMinAudioBitrateChange(newBitrate);
              }}
              value={minAudioBitrateTxt}
              disabled={isMinAudioBitrateLimited === false}
              className="optionInput"
            />
            <Button
              className={
                parseFloat(minAudioBitrateTxt) === defaultMinAudioBitrate
                  ? "resetBtn disabledResetBtn"
                  : "resetBtn"
              }
              ariaLabel="Reset option to default value"
              title="Reset option to default value"
              onClick={() => {
                updateMinAudioBitrateText(String(defaultMinAudioBitrate));
                onMinAudioBitrateChange(defaultMinAudioBitrate);
                setMinAudioBitrateLimit(defaultMinAudioBitrate !== 0);
              }}
              value={String.fromCharCode(0xf021)}
            />
          </span>
        </div>
        <Checkbox
          className="playerOptionsCheckBox"
          ariaLabel="Min video bitrate limit"
          name="minAudioBitrateLimit"
          checked={isMinAudioBitrateLimited === false}
          onChange={onChangeLimitMinAudioBitrate}
        >
          Do not limit
        </Checkbox>
        <span className="option-desc">
          {
            !isMinAudioBitrateLimited || minAudioBitrate <= 0 ?
              "Not limiting the lowest audio bitrate reachable through the adaptive logic" :
              "Limiting the lowest audio bitrate reachable through the adaptive " +
              `logic to ${minAudioBitrate} bits per seconds`
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
              onChange={(evt) => {
                const { value } = evt.target;
                updateMaxAudioBitrateText(value);
                let newBitrate = value === "" ?
                  defaultMaxAudioBitrate :
                  parseFloat(value);
                newBitrate = isNaN(newBitrate) ?
                  defaultMaxAudioBitrate :
                  newBitrate;
                onMaxAudioBitrateChange(newBitrate);
              }}
              value={maxAudioBitrateTxt}
              disabled={isMaxAudioBitrateLimited === false}
              className="optionInput"
            />
            <Button
              className={
                parseFloat(maxAudioBitrateTxt) === defaultMaxAudioBitrate
                  ? "resetBtn disabledResetBtn"
                  : "resetBtn"
              }
              ariaLabel="Reset option to default value"
              title="Reset option to default value"
              onClick={() => {
                updateMaxAudioBitrateText(String(defaultMaxAudioBitrate));
                onMaxAudioBitrateChange(defaultMaxAudioBitrate);
                setMaxAudioBitrateLimit(defaultMaxAudioBitrate !== Infinity);
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
            checked={isMaxAudioBitrateLimited === false}
            onChange={onChangeLimitMaxAudioBitrate}
          >
            Do not limit
          </Checkbox>
        </div>
        <span className="option-desc">
          {
            !isMaxAudioBitrateLimited || parseFloat(
              maxAudioBitrate
            ) === Infinity ?
              "Not limiting the highest audio bitrate reachable through " +
                "the adaptive logic" :
              "Limiting the highest audio bitrate reachable through the " +
                `adaptive logic to ${maxAudioBitrate} bits per seconds`
          }
        </span>
      </li>
    </Fragment>
  );
}

export default React.memo(AudioAdaptiveSettings);
