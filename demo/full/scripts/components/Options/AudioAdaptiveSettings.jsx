import React, { Fragment, useCallback, useEffect, useState } from "react";
import getCheckBoxValue from "../../lib/getCheckboxValue";
import Checkbox from "../../components/CheckBox";
import Button from "../Button";
import DEFAULT_VALUES from "../../lib/defaultOptionsValues";

const defaultInitialAudioBitrate = DEFAULT_VALUES.player.initialAudioBitrate;
const defaultMinAudioBitrate = DEFAULT_VALUES.player.minAudioBitrate;
const defaultMaxAudioBitrate = DEFAULT_VALUES.player.maxAudioBitrate;

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
  /* Value of the `initialVideoBitrate` input */
  const [initialAudioBitrateStr, setInitialAudioBitrateStr] = useState(
    String(initialAudioBitrate)
  );
  /* Value of the `minAudioBitrate` input */
  const [minAudioBitrateStr, setMinAudioBitrateStr] = useState(
    String(minAudioBitrate)
  );
  /* Value of the `maxAudioBitrate` input */
  const [maxAudioBitrateStr, setMaxAudioBitrateStr] = useState(
    String(maxAudioBitrate)
  );
  /*
   * Keep track of the "limit minAudioBitrate" toggle:
   * `false` == checkbox enabled
   */
  const [isMinAudioBitrateLimited, setMinAudioBitrateLimit] = useState(
    minAudioBitrate !== 0
  );
  /*
   * Keep track of the "limit maxAudioBitrate" toggle:
   * `false` == checkbox enabled
   */
  const [isMaxAudioBitrateLimited, setMaxAudioBitrateLimit] = useState(
    maxAudioBitrate !== Infinity
  );

  // Update initialAudioBitrate when its linked text change
  useEffect(() => {
    // Note that this unnecessarily also run on first render - there seem to be
    // no quick and easy way to disable this in react.
    // This is not too problematic so I put up with it.
    let newBitrate = parseFloat(initialAudioBitrateStr);
    newBitrate = isNaN(newBitrate) ?
      defaultInitialAudioBitrate :
      newBitrate;
    onInitialAudioBitrateChange(newBitrate);
  }, [initialAudioBitrateStr]);

  // Update minAudioBitrate when its linked text change
  useEffect(() => {
    let newBitrate = parseFloat(minAudioBitrateStr);
    newBitrate = isNaN(newBitrate) ?
      defaultMinAudioBitrate :
      newBitrate;
    onMinAudioBitrateChange(newBitrate);
  }, [minAudioBitrateStr]);

  // Update maxAudioBitrate when its linked text change
  useEffect(() => {
    let newBitrate = parseFloat(maxAudioBitrateStr);
    newBitrate = isNaN(newBitrate) ?
      defaultMaxAudioBitrate :
      newBitrate;
    onMaxAudioBitrateChange(newBitrate);
  }, [maxAudioBitrateStr]);

  const onChangeLimitMinAudioBitrate = useCallback((evt) => {
    const isNotLimited = getCheckBoxValue(evt.target);
    if (isNotLimited) {
      setMinAudioBitrateLimit(false);
      setMinAudioBitrateStr(String(0));
    } else {
      setMinAudioBitrateLimit(true);
      setMinAudioBitrateStr(String(defaultMinAudioBitrate));
    }
  }, []);

  const onChangeLimitMaxAudioBitrate = useCallback((evt) => {
    const isNotLimited = getCheckBoxValue(evt.target);
    if (isNotLimited) {
      setMaxAudioBitrateLimit(false);
      setMaxAudioBitrateStr(String(Infinity));
    } else {
      setMaxAudioBitrateLimit(true);
      setMaxAudioBitrateStr(String(defaultMaxAudioBitrate));
    }
  }, []);

  return (
    <Fragment>
      <li>
        <PlayerOptionNumberInput
          ariaLabel="Initial audio bitrate option"
          label="initialAudioBitrate"
          title="Initial Audio Bitrate"
          value={initialAudioBitrateStr}
          defaultValueAsNumber={defaultInitialAudioBitrate}
          isDisabled={false}
          onUpdateValue={setInitialAudioBitrateStr}
          onResetClick={() => {
            setInitialAudioBitrateStr(String(
              defaultInitialAudioBitrate
            ));
          }}
        />
        <div className="playerOptionInput">
          <label htmlFor="initialAudioBitrate">Initial Audio Bitrate</label>
          <span className="wrapperInputWithResetBtn">
            <input
              type="text"
              name="initialAudioBitrate"
              id="initialAudioBitrate"
              aria-label="Initial audio bitrate option"
              placeholder="Number"
              onChange={(evt) =>
                setInitialAudioBitrateStr(evt.target.value)
              }
              value={initialAudioBitrateStr}
              className="optionInput"
            />
            <Button
              className={
                parseFloat(
                  initialAudioBitrateStr
                ) === defaultInitialAudioBitrate
                  ? "resetBtn disabledResetBtn"
                  : "resetBtn"
              }
              ariaLabel="Reset option to default value"
              title="Reset option to default value"
              onClick={() => {
                setInitialAudioBitrateStr(String(
                  defaultInitialAudioBitrate
                ));
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
              onChange={(evt) => setMinAudioBitrateStr(evt.target.value)}
              value={minAudioBitrateStr}
              disabled={isMinAudioBitrateLimited === false}
              className="optionInput"
            />
            <Button
              className={
                parseFloat(minAudioBitrateStr) === defaultMinAudioBitrate
                  ? "resetBtn disabledResetBtn"
                  : "resetBtn"
              }
              ariaLabel="Reset option to default value"
              title="Reset option to default value"
              onClick={() => {
                setMinAudioBitrateStr(String(defaultMinAudioBitrate));
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
                setMaxAudioBitrateStr(value);
                let newBitrate = value === "" ?
                  defaultMaxAudioBitrate :
                  parseFloat(value);
                newBitrate = isNaN(newBitrate) ?
                  defaultMaxAudioBitrate :
                  newBitrate;
                onMaxAudioBitrateChange(newBitrate);
              }}
              value={maxAudioBitrateStr}
              disabled={isMaxAudioBitrateLimited === false}
              className="optionInput"
            />
            <Button
              className={
                parseFloat(maxAudioBitrateStr) === defaultMaxAudioBitrate
                  ? "resetBtn disabledResetBtn"
                  : "resetBtn"
              }
              ariaLabel="Reset option to default value"
              title="Reset option to default value"
              onClick={() => {
                setMaxAudioBitrateStr(String(defaultMaxAudioBitrate));
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

function PlayerOptionNumberInput({
  ariaLabel,
  label,
  title,
  onUpdateValue,
  value,
  defaultValueAsNumber,
  isDisabled,
  onResetClick,
}) {
  return <div className="playerOptionInput">
    <label htmlFor={label}>{title}</label>
    <span className="wrapperInputWithResetBtn">
      <input
        type="text"
        name={label}
        id={label}
        aria-label={ariaLabel}
        placeholder="Number"
        onChange={(evt) => onUpdateValue(evt.target.value)}
        value={value}
        disabled={isDisabled}
        className="optionInput"
      />
      <Button
        className={
          parseFloat(value) === defaultValueAsNumber
            ? "resetBtn disabledResetBtn"
            : "resetBtn"
        }
        ariaLabel="Reset option to default value"
        title="Reset option to default value"
        onClick={onResetClick}
        value={String.fromCharCode(0xf021)}
      />
    </span>
  </div>;
}
