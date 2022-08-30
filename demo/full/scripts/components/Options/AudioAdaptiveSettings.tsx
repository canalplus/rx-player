import * as React from "react";
import Checkbox from "../../components/CheckBox";
import DEFAULT_VALUES from "../../lib/defaultOptionsValues";
import PlayerOptionNumberInput from "./PlayerOptionNumberInput";

const { Fragment, useCallback, useEffect, useState } = React;
const DEFAULT_MIN_AUDIO_BITRATE = DEFAULT_VALUES.player.minAudioBitrate;
const DEFAULT_MAX_AUDIO_BITRATE = DEFAULT_VALUES.player.maxAudioBitrate;

/**
 * @param {Object} props
 * @returns {Object}
 */
function AudioAdaptiveSettings({
  minAudioBitrate,
  maxAudioBitrate,
  onMinAudioBitrateChange,
  onMaxAudioBitrateChange,
}: {
  minAudioBitrate: number;
  maxAudioBitrate: number;
  onMinAudioBitrateChange: (newBitrate: number) => void;
  onMaxAudioBitrateChange: (newBitrate: number) => void;
}): JSX.Element {
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

  // Update minAudioBitrate when its linked text change
  useEffect(() => {
    let newBitrate = parseFloat(minAudioBitrateStr);
    newBitrate = isNaN(newBitrate) ?
      DEFAULT_MIN_AUDIO_BITRATE :
      newBitrate;
    onMinAudioBitrateChange(newBitrate);
  }, [minAudioBitrateStr]);

  // Update maxAudioBitrate when its linked text change
  useEffect(() => {
    let newBitrate = parseFloat(maxAudioBitrateStr);
    newBitrate = isNaN(newBitrate) ?
      DEFAULT_MAX_AUDIO_BITRATE :
      newBitrate;
    onMaxAudioBitrateChange(newBitrate);
  }, [maxAudioBitrateStr]);

  const onChangeLimitMinAudioBitrate = useCallback(
    (isNotLimited: boolean) => {
      if (isNotLimited) {
        setMinAudioBitrateLimit(false);
        setMinAudioBitrateStr(String(0));
      } else {
        setMinAudioBitrateLimit(true);
        setMinAudioBitrateStr(String(DEFAULT_MIN_AUDIO_BITRATE));
      }
    }, []);

  const onChangeLimitMaxAudioBitrate = useCallback(
    (isNotLimited: boolean) => {
      if (isNotLimited) {
        setMaxAudioBitrateLimit(false);
        setMaxAudioBitrateStr(String(Infinity));
      } else {
        setMaxAudioBitrateLimit(true);
        setMaxAudioBitrateStr(String(DEFAULT_MAX_AUDIO_BITRATE));
      }
    }, []);

  const onMinAudioBitrateResetClick = useCallback(() => {
    setMinAudioBitrateStr(String(DEFAULT_MIN_AUDIO_BITRATE));
    setMinAudioBitrateLimit(DEFAULT_MIN_AUDIO_BITRATE !== 0);
  }, []);

  const onMaxAudioBitrateResetClick = useCallback(() => {
    setMaxAudioBitrateStr(String(DEFAULT_MAX_AUDIO_BITRATE));
    setMaxAudioBitrateLimit(DEFAULT_MAX_AUDIO_BITRATE !== Infinity);
  }, []);

  return (
    <Fragment>
      <li>
        <PlayerOptionNumberInput
          ariaLabel="Min audio bitrate option"
          label="minAudioBitrate"
          title="Min Audio Bitrate"
          valueAsString={minAudioBitrateStr}
          defaultValueAsNumber={DEFAULT_MIN_AUDIO_BITRATE}
          isDisabled={isMinAudioBitrateLimited === false}
          onUpdateValue={setMinAudioBitrateStr}
          onResetClick={onMinAudioBitrateResetClick}
        />
        <Checkbox
          className="playerOptionsCheckBox"
          ariaLabel="Min audio bitrate limit"
          name="minAudioBitrateLimit"
          checked={isMinAudioBitrateLimited === false}
          onChange={onChangeLimitMinAudioBitrate}
        >
          {"Do not limit"}
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
          defaultValueAsNumber={DEFAULT_MAX_AUDIO_BITRATE}
          isDisabled={isMaxAudioBitrateLimited === false}
          onUpdateValue={setMaxAudioBitrateStr}
          onResetClick={onMaxAudioBitrateResetClick}
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
            !isMaxAudioBitrateLimited || maxAudioBitrate === Infinity ?
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
