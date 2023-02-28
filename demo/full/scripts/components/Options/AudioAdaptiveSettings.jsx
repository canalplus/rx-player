import React, { Fragment, useCallback, useEffect, useState } from "react";
import getCheckBoxValue from "../../lib/getCheckboxValue";
import Checkbox from "../../components/CheckBox";
import DEFAULT_VALUES from "../../lib/defaultOptionsValues";
import PlayerOptionNumberInput from "./PlayerOptionNumberInput";

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
          valueAsString={initialAudioBitrateStr}
          defaultValueAsNumber={defaultInitialAudioBitrate}
          isDisabled={false}
          onUpdateValue={setInitialAudioBitrateStr}
          onResetClick={() => {
            setInitialAudioBitrateStr(String(
              defaultInitialAudioBitrate
            ));
          }}
        />
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
        <PlayerOptionNumberInput
          ariaLabel="Min audio bitrate option"
          label="minAudioBitrate"
          title="Min Audio Bitrate"
          valueAsString={minAudioBitrateStr}
          defaultValueAsNumber={defaultMinAudioBitrate}
          isDisabled={isMinAudioBitrateLimited === false}
          onUpdateValue={setMinAudioBitrateStr}
          onResetClick={() => {
            setMinAudioBitrateStr(String(defaultMinAudioBitrate));
            setMinAudioBitrateLimit(defaultMinAudioBitrate !== 0);
          }}
        />
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
        <PlayerOptionNumberInput
          ariaLabel="Max audio bitrate option"
          label="maxAudioBitrate"
          title="Max Audio Bitrate"
          valueAsString={maxAudioBitrateStr}
          defaultValueAsNumber={defaultMaxAudioBitrate}
          isDisabled={isMaxAudioBitrateLimited === false}
          onUpdateValue={setMaxAudioBitrateStr}
          onResetClick={() => {
            setMaxAudioBitrateStr(String(defaultMaxAudioBitrate));
            setMaxAudioBitrateLimit(defaultMaxAudioBitrate !== Infinity);
          }}
        />
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
