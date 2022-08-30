import * as React from "react";
import Checkbox from "../../components/CheckBox";
import DEFAULT_VALUES from "../../lib/defaultOptionsValues";
import PlayerOptionNumberInput from "./PlayerOptionNumberInput";

const { Fragment, useCallback, useEffect, useState } = React;

const DEFAULT_MIN_VIDEO_BITRATE = DEFAULT_VALUES.player.minVideoBitrate;
const DEFAULT_MAX_VIDEO_BITRATE = DEFAULT_VALUES.player.maxVideoBitrate;

/**
 * @param {Object} props
 * @returns {Object}
 */
function VideoAdaptiveSettings({
  minVideoBitrate,
  maxVideoBitrate,
  onMinVideoBitrateChange,
  onMaxVideoBitrateChange,
  limitVideoWidth,
  throttleVideoBitrateWhenHidden,
  onLimitVideoWidthChange,
  onThrottleVideoBitrateWhenHiddenChange,
}: {
  minVideoBitrate: number;
  maxVideoBitrate: number;
  onMinVideoBitrateChange: (newBitrate: number) => void;
  onMaxVideoBitrateChange: (newBitrate: number) => void;
  limitVideoWidth: boolean;
  throttleVideoBitrateWhenHidden: boolean;
  onLimitVideoWidthChange: (newVal: boolean) => void;
  onThrottleVideoBitrateWhenHiddenChange: (newVal: boolean) => void;
}): JSX.Element {
  /* Value of the `minVideoBitrate` input */
  const [minVideoBitrateStr, setMinVideoBitrateStr] = useState(
    String(minVideoBitrate)
  );
  /* Value of the `maxVideoBitrate` input */
  const [maxVideoBitrateStr, setMaxVideoBitrateStr] = useState(
    String(maxVideoBitrate)
  );
  /*
   * Keep track of the "limit minVideoBitrate" toggle:
   * `false` == checkbox enabled
   */
  const [isMinVideoBitrateLimited, setMinVideoBitrateLimit] = useState(
    minVideoBitrate !== 0
  );
  /*
   * Keep track of the "limit maxVideoBitrate" toggle:
   * `false` == checkbox enabled
   */
  const [isMaxVideoBitrateLimited, setMaxVideoBitrateLimit] = useState(
    maxVideoBitrate !== Infinity
  );

  // Update minVideoBitrate when its linked text change
  useEffect(() => {
    let newBitrate = parseFloat(minVideoBitrateStr);
    newBitrate = isNaN(newBitrate) ?
      DEFAULT_MIN_VIDEO_BITRATE :
      newBitrate;
    onMinVideoBitrateChange(newBitrate);
  }, [minVideoBitrateStr]);

  // Update maxVideoBitrate when its linked text change
  useEffect(() => {
    let newBitrate = parseFloat(maxVideoBitrateStr);
    newBitrate = isNaN(newBitrate) ?
      DEFAULT_MAX_VIDEO_BITRATE :
      newBitrate;
    onMaxVideoBitrateChange(newBitrate);
  }, [maxVideoBitrateStr]);

  const onChangeLimitMinVideoBitrate = useCallback(
    (isNotLimited: boolean) => {
      if (isNotLimited) {
        setMinVideoBitrateLimit(false);
        setMinVideoBitrateStr(String(0));
      } else {
        setMinVideoBitrateLimit(true);
        setMinVideoBitrateStr(String(DEFAULT_MIN_VIDEO_BITRATE));
      }
    }, []);

  const onChangeLimitMaxVideoBitrate = useCallback(
    (isNotLimited: boolean) => {
      if (isNotLimited) {
        setMaxVideoBitrateLimit(false);
        setMaxVideoBitrateStr(String(Infinity));
      } else {
        setMaxVideoBitrateLimit(true);
        setMaxVideoBitrateStr(String(DEFAULT_MAX_VIDEO_BITRATE));
      }
    }, []);

  const onMinVideoBitrateResetClick = useCallback(() => {
    setMinVideoBitrateStr(String(DEFAULT_MIN_VIDEO_BITRATE));
    setMinVideoBitrateLimit(DEFAULT_MIN_VIDEO_BITRATE !== 0);
  }, []);

  const onMaxVideoBitrateResetClick = useCallback(() => {
    setMaxVideoBitrateStr(String(DEFAULT_MAX_VIDEO_BITRATE));
    setMaxVideoBitrateLimit(DEFAULT_MAX_VIDEO_BITRATE !== Infinity);
  }, []);

  return (
    <Fragment>
      <li>
        <PlayerOptionNumberInput
          ariaLabel="Min video bitrate option"
          label="minVideoBitrate"
          title="Min Video Bitrate"
          valueAsString={minVideoBitrateStr}
          defaultValueAsNumber={DEFAULT_MIN_VIDEO_BITRATE}
          isDisabled={isMinVideoBitrateLimited === false}
          onUpdateValue={setMinVideoBitrateStr}
          onResetClick={onMinVideoBitrateResetClick}
        />
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
        <PlayerOptionNumberInput
          ariaLabel="Max video bitrate option"
          label="maxVideoBitrate"
          title="Max Video Bitrate"
          valueAsString={maxVideoBitrateStr}
          defaultValueAsNumber={DEFAULT_MAX_VIDEO_BITRATE}
          isDisabled={isMaxVideoBitrateLimited === false}
          onUpdateValue={setMaxVideoBitrateStr}
          onResetClick={onMaxVideoBitrateResetClick}
        />
        <div>
          <Checkbox
            ariaLabel="Maximum video bitrate"
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
            !isMaxVideoBitrateLimited || maxVideoBitrate === Infinity ?
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
            ariaLabel="Limit video width option"
            checked={limitVideoWidth}
            onChange={onLimitVideoWidthChange}
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
