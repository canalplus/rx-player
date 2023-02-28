import React, { Fragment, useCallback, useEffect, useState } from "react";
import getCheckBoxValue from "../../lib/getCheckboxValue";
import Checkbox from "../CheckBox";
import DEFAULT_VALUES from "../../lib/defaultOptionsValues";
import PlayerOptionNumberInput from "./PlayerOptionNumberInput";

const defaultMaxBufferAhead = DEFAULT_VALUES.player.maxBufferAhead;
const defaultMaxBufferBehind = DEFAULT_VALUES.player.maxBufferBehind;
const defaultMaxVideoBufferSize = DEFAULT_VALUES.player.maxVideoBufferSize;
const defaultWantedBufferAhead = DEFAULT_VALUES.player.wantedBufferAhead;

/**
 * @param {Object} props
 * @returns {Object}
 */
function BufferOptions({
  wantedBufferAhead,
  maxVideoBufferSize,
  maxBufferAhead,
  maxBufferBehind,
  onWantedBufferAheadChange,
  onMaxVideoBufferSizeChange,
  onMaxBufferAheadChange,
  onMaxBufferBehindChange,
}) {
  /* Value of the `wantedBufferAhead` input */
  const [wantedBufferAheadStr, setWantedBufferAheadStr] = useState(
    wantedBufferAhead
  );
  /* Value of the `maxVideoBufferSize` input */
  const [maxVideoBufferSizeStr, setMaxVideoBufferSizeStr] = useState(
    maxVideoBufferSize
  );
  /* Value of the `maxBufferBehind` input */
  const [maxBufferBehindStr, setMaxBufferBehindStr] = useState(
    maxBufferBehind
  );
  /* Value of the `maxBufferAhead` input */
  const [maxBufferAheadStr, setMaxBufferAheadStr] = useState(
    maxBufferAhead
  );
  /*
   * Keep track of the "limit maxBufferAhead" toggle:
   * `false` == checkbox enabled
   */
  const [isMaxBufferAheadLimited, setMaxBufferAheadLimit] = useState(
    maxBufferAhead !== Infinity
  );
  /*
   * Keep track of the "limit maxBufferBehind" toggle:
   * `false` == checkbox enabled
   */
  const [isMaxBufferBehindLimited, setMaxBufferBehindLimit] = useState(
    maxBufferBehind !== Infinity
  );
  /*
   * Keep track of the "limit maxVideoBufferSize" toggle:
   * `false` == checkbox enabled
   */
  const [isMaxVideoBufferSizeLimited, setMaxVideoBufferSizeLimit] = useState(
    maxVideoBufferSize !== Infinity
  );

  // Update `wantedBufferAhead` when its linked text change
  useEffect(() => {
    // Note that this unnecessarily also run on first render - there seem to be
    // no quick and easy way to disable this in react.
    // This is not too problematic so I put up with it.
    let newVal = parseFloat(wantedBufferAheadStr);
    newVal = isNaN(newVal) ?
      defaultWantedBufferAhead :
      newVal;
    onWantedBufferAheadChange(newVal);
  }, [wantedBufferAheadStr]);

  // Update `maxVideoBufferSize` when its linked text change
  useEffect(() => {
    let newVal = parseFloat(maxVideoBufferSizeStr);
    newVal = isNaN(newVal) ?
      defaultMaxVideoBufferSize :
      newVal;
    onMaxVideoBufferSizeChange(newVal);
  }, [maxVideoBufferSizeStr]);

  // Update `maxBufferAhead` when its linked text change
  useEffect(() => {
    let newVal = parseFloat(maxBufferAheadStr);
    newVal = isNaN(newVal) ?
      defaultMaxBufferAhead :
      newVal;
    onMaxBufferAheadChange(newVal);
  }, [maxBufferAheadStr]);

  // Update `maxBufferBehind` when its linked text change
  useEffect(() => {
    let newVal = parseFloat(maxBufferBehindStr);
    newVal = isNaN(newVal) ?
      defaultMaxBufferBehind :
      newVal;
    onMaxBufferBehindChange(newVal);
  }, [maxBufferBehindStr]);

  const onChangeLimitMaxBufferAhead = useCallback((evt) => {
    const isNotLimited = getCheckBoxValue(evt.target);
    if (isNotLimited) {
      setMaxBufferAheadLimit(false);
      setMaxBufferAheadStr(String(Infinity));
    } else {
      setMaxBufferAheadLimit(true);
      setMaxBufferAheadStr(String(defaultMaxBufferAhead));
    }
  }, []);

  const onChangeLimitMaxBufferBehind = useCallback((evt) => {
    const isNotLimited = getCheckBoxValue(evt.target);
    if (isNotLimited) {
      setMaxBufferBehindLimit(false);
      setMaxBufferBehindStr(String(defaultMaxBufferAhead));
    } else {
      setMaxBufferBehindLimit(true);
      setMaxBufferBehindStr(String(defaultMaxBufferBehind));
    }
  }, []);

  const onChangeLimitMaxVideoBufferSize = useCallback((evt) => {
    const isNotLimited = getCheckBoxValue(evt.target);
    if (isNotLimited){
      setMaxVideoBufferSizeLimit(false);
      setMaxVideoBufferSizeStr(String(Infinity));
    } else {
      setMaxVideoBufferSizeLimit(true);
      setMaxVideoBufferSizeStr(String(defaultMaxVideoBufferSize));
    }
  }, []);

  return (
    <Fragment>
      <li>
        <PlayerOptionNumberInput
          ariaLabel="Wanted Buffer Ahead option"
          label="wantedBufferAhead"
          title="Wanted Buffer Ahead"
          valueAsString={wantedBufferAheadStr}
          defaultValueAsNumber={defaultWantedBufferAhead}
          isDisabled={false}
          onUpdateValue={setWantedBufferAheadStr}
          onResetClick={() => {
            setWantedBufferAheadStr(String(
              defaultWantedBufferAhead
            ));
          }}
        />
        <span className="option-desc">
          Buffering around {wantedBufferAhead} second(s) ahead of the current
          position
        </span>
      </li>
      <li>
        <PlayerOptionNumberInput
          ariaLabel="maxVideoBufferSize option"
          label="maxVideoBufferSize"
          title="Max Video Buffer Size"
          valueAsString={maxVideoBufferSizeStr}
          defaultValueAsNumber={defaultMaxVideoBufferSize}
          isDisabled={isMaxVideoBufferSizeLimited === false}
          onUpdateValue={setMaxVideoBufferSizeStr}
          onResetClick={() => {
            setMaxVideoBufferSizeStr(String(defaultMaxVideoBufferSize));
            setMaxVideoBufferSizeLimit(defaultMaxVideoBufferSize !== Infinity);
          }}
        />
        <Checkbox
          className="playerOptionsCheckBox"
          ariaLabel="Do not limit maxVideoBufferSize option"
          name="maxVideoBufferSizeLimit"
          checked={isMaxVideoBufferSizeLimited === false}
          onChange={onChangeLimitMaxVideoBufferSize}
        >
          Do not limit
        </Checkbox>
        <span className="option-desc">
          {
            maxVideoBufferSize === Infinity ||
            !isMaxVideoBufferSizeLimited ?
              "Not setting a size limit to the video buffer (relying only on the wantedBufferAhead option)" :
              `Buffering at most around ${maxVideoBufferSize} kilobyte(s) on the video buffer`
          }
        </span>
      </li>
      <li>
        <PlayerOptionNumberInput
          ariaLabel="maxBufferAhead option"
          label="maxBufferAhead"
          title="Max Buffer Ahead"
          valueAsString={maxBufferAheadStr}
          defaultValueAsNumber={defaultMaxBufferAhead}
          isDisabled={isMaxBufferAheadLimited === false}
          onUpdateValue={setMaxBufferAheadStr}
          onResetClick={() => {
            setMaxBufferAheadStr(String(defaultMaxBufferAhead));
            setMaxBufferAheadLimit(defaultMaxBufferAhead !== Infinity);
          }}
        />
        <Checkbox
          className="playerOptionsCheckBox"
          ariaLabel="Do not limit max buffer a head option"
          name="maxBufferAheadLimit"
          checked={isMaxBufferAheadLimited === false}
          onChange={onChangeLimitMaxBufferAhead}
        >
          Do not limit
        </Checkbox>
        <span className="option-desc">
          {
            maxBufferAhead === Infinity ||
            !isMaxBufferAheadLimited ?
              "Not manually cleaning buffer far ahead of the current position" :
              `Manually cleaning data ${maxBufferAhead} second(s) ahead of the current position`
          }
        </span>
      </li>
      <li>
        <PlayerOptionNumberInput
          ariaLabel="maxBufferBehind option"
          label="maxBufferBehind"
          title="Max Buffer Behind"
          valueAsString={maxBufferBehindStr}
          defaultValueAsNumber={defaultMaxBufferBehind}
          isDisabled={isMaxBufferBehindLimited === false}
          onUpdateValue={setMaxBufferBehindStr}
          onResetClick={() => {
            setMaxBufferBehindStr(String(defaultMaxBufferBehind));
            setMaxBufferBehindLimit(defaultMaxBufferBehind !== Infinity);
          }}
        />
        <Checkbox
          className="playerOptionsCheckBox"
          ariaLabel="Do not limit max buffer behind option"
          name="maxBufferBehindLimit"
          checked={isMaxBufferBehindLimited === false}
          onChange={onChangeLimitMaxBufferBehind}
        >
          Do not limit
        </Checkbox>
        <span className="option-desc">
          {
            maxBufferBehind === Infinity ||
            !isMaxBufferBehindLimited ?
              "Not manually cleaning buffer behind the current position" :
              `Manually cleaning data ${maxBufferBehind} second(s) behind the current position`
          }
        </span>
      </li>
    </Fragment>
  );
}

export default React.memo(BufferOptions);
