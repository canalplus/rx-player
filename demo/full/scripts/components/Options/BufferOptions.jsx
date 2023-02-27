import React, { Fragment, useState } from "react";

import getCheckBoxValue from "../../lib/getCheckboxValue";
import Checkbox from "../CheckBox";
import Button from "../Button";
import DEFAULT_VALUES from "../../lib/defaultOptionsValues";

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
  const [wantedBufferAheadTxt, updateWantedBufferAheadText] = useState(
    wantedBufferAhead
  );
  const [maxVideoBufferSizeTxt, updateMaxVideoBufferSizeText] = useState(
    maxVideoBufferSize
  );
  const [maxBufferBehindTxt, updateMaxBufferBehindText] = useState(
    maxBufferBehind
  );
  const [maxBufferAheadTxt, updateMaxBufferAheadText] = useState(
    maxBufferAhead
  );
  const [isMaxBufferAheadLimited, setMaxBufferAheadLimit] = useState(
    maxBufferAhead !== Infinity
  );
  const [isMaxBufferBehindLimited, setMaxBufferBehindLimit] = useState(
    maxBufferBehind !== Infinity
  );

  const [isMaxVideoBufferSizeLimited, setMaxVideoBufferSizeLimit] = useState(
    maxVideoBufferSize !== Infinity
  );

  const defaultMaxBufferAhead = DEFAULT_VALUES.player.maxBufferAhead;
  const defaultMaxBufferBehind = DEFAULT_VALUES.player.maxBufferBehind;
  const defaultMaxVideoBufferSize = DEFAULT_VALUES.player.maxVideoBufferSize;
  const defaultWantedBufferAhead = DEFAULT_VALUES.player.wantedBufferAhead;

  const onChangeLimitMaxBufferAhead = (evt) => {
    const isNotLimited = getCheckBoxValue(evt.target);
    if (isNotLimited) {
      setMaxBufferAheadLimit(false);
      updateMaxBufferAheadText(String(Infinity));
      onMaxBufferAheadChange(Infinity);
    } else {
      setMaxBufferAheadLimit(true);
      updateMaxBufferAheadText(String(defaultMaxBufferAhead));
      onMaxBufferAheadChange(defaultMaxBufferAhead);
    }
  };

  const onChangeLimitMaxBufferBehind = (evt) => {
    const isNotLimited = getCheckBoxValue(evt.target);
    if (isNotLimited) {
      setMaxBufferBehindLimit(false);
      updateMaxBufferBehindText(String(defaultMaxBufferAhead));
      onMaxBufferBehindChange(Infinity);
    } else {
      setMaxBufferBehindLimit(true);
      updateMaxBufferBehindText(String(defaultMaxBufferBehind));
      onMaxBufferBehindChange(defaultMaxBufferBehind);
    }
  };

  const onChangeLimitMaxVideoBufferSize = (evt) => {
    const isNotLimited = getCheckBoxValue(evt.target);
    if (isNotLimited){
      setMaxVideoBufferSizeLimit(false);
      updateMaxVideoBufferSizeText(String(Infinity));
      onMaxVideoBufferSizeChange(Infinity);
    } else {
      setMaxVideoBufferSizeLimit(true);
      updateMaxVideoBufferSizeText(String(defaultMaxVideoBufferSize));
      onMaxVideoBufferSizeChange(defaultMaxVideoBufferSize);
    }
  };

  return (
    <Fragment>
      <li>
        <div className="playerOptionInput">
          <label htmlFor="wantedBufferAhead">Wanted Buffer Ahead</label>
          <span className="wrapperInputWithResetBtn">
            <input
              type="text"
              step="10"
              aria-label="Wanted buffer a head option"
              name="wantedBufferAhead"
              id="wantedBufferAhead"
              placeholder="Number"
              onChange={(evt) => {
                const { value } = evt.target;
                updateWantedBufferAheadText(value);
                let newValue = value === "" ?
                  defaultWantedBufferAhead :
                  parseFloat(value);
                newValue = isNaN(newValue) ?
                  defaultWantedBufferAhead :
                  newValue;
                onWantedBufferAheadChange(newValue);
              }}
              value={wantedBufferAheadTxt}
              className="optionInput"
            />
            <Button
              className={
                parseFloat(wantedBufferAheadTxt) === defaultWantedBufferAhead
                  ? "resetBtn disabledResetBtn"
                  : "resetBtn"
              }
              ariaLabel="Reset option to default value"
              title="Reset option to default value"
              onClick={() => {
                updateWantedBufferAheadText(String(
                  defaultWantedBufferAhead
                ));
                onWantedBufferAheadChange(defaultWantedBufferAhead);
              }}
              value={String.fromCharCode(0xf021)}
            />
          </span>
        </div>
        <span className="option-desc">
          Buffering around {wantedBufferAhead} second(s) ahead of the current
          position
        </span>
      </li>
      <li>
        <div className="playerOptionInput">
          <label htmlFor="maxVideoBufferSize"> Max Video Buffer Size</label>
          <span className="wrapperInputWithResetBtn">
            <input
              type="text"
              step="10"
              aria-label="maxVideoBufferSize option"
              name="maxVideoBufferSize"
              id="maxVideoBufferSize"
              placeholder="Number"
              onChange={(evt) => {
                const { value } = evt.target;
                updateMaxVideoBufferSizeText(value);
                let newValue = value === "" ?
                  defaultMaxVideoBufferSize :
                  parseFloat(value);
                newValue = isNaN(newValue) ?
                  defaultMaxVideoBufferSize :
                  newValue;
                onMaxVideoBufferSizeChange(newValue);
              }}
              value={maxVideoBufferSizeTxt}
              disabled={isMaxVideoBufferSizeLimited === false}
              className="optionInput"
            />
            <Button
              className={
                parseFloat(maxVideoBufferSizeTxt) === defaultMaxVideoBufferSize
                  ? "resetBtn disabledResetBtn"
                  : "resetBtn"
              }
              ariaLabel="Reset option to default value"
              title="Reset option to default value"
              onClick={() => {
                updateMaxVideoBufferSizeText(String(
                  defaultMaxVideoBufferSize
                ));
                onMaxVideoBufferSizeChange(defaultMaxVideoBufferSize);
                setMaxVideoBufferSizeLimit(
                  defaultMaxVideoBufferSize !== Infinity
                );
              }}
              value={String.fromCharCode(0xf021)}
            />
          </span>
        </div>
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
        <div className="playerOptionInput">
          <label htmlFor="maxBufferAhead">Max Buffer Ahead</label>
          <span className="wrapperInputWithResetBtn">
            <input
              type="text"
              aria-label="Max buffer a head option"
              name="maxBufferAhead"
              id="maxBufferAhead"
              placeholder="Number"
              onChange={(evt) => {
                const { value } = evt.target;
                updateMaxBufferAheadText(value);
                let newValue = value === "" ?
                  defaultMaxBufferAhead :
                  parseFloat(value);
                newValue = isNaN(newValue) ?
                  defaultMaxBufferAhead :
                  newValue;
                onMaxBufferAheadChange(newValue);
              }}
              value={maxBufferAheadTxt}
              disabled={isMaxBufferAheadLimited === false}
              className="optionInput"
            />
            <Button
              className={
                parseFloat(maxBufferAheadTxt) === defaultMaxBufferAhead
                  ? "resetBtn disabledResetBtn"
                  : "resetBtn"
              }
              ariaLabel="Reset option to default value"
              title="Reset option to default value"
              onClick={() => {
                updateMaxBufferAheadText(String(
                  defaultMaxBufferAhead
                ));
                onMaxBufferAheadChange(defaultMaxBufferAhead);
                setMaxBufferAheadLimit(defaultMaxBufferAhead !== Infinity);
              }}
              value={String.fromCharCode(0xf021)}
            />
          </span>
        </div>
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
        <div className="playerOptionInput">
          <label htmlFor="maxBufferBehind">Max Buffer Behind</label>
          <span className="wrapperInputWithResetBtn">
            <input
              type="text"
              aria-label="Max buffer behind option"
              name="maxBufferBehind"
              id="maxBufferBehind"
              placeholder="Number"
              onChange={(evt) => {
                const { value } = evt.target;
                updateMaxBufferBehindText(value);
                let newValue = value === "" ?
                  defaultMaxBufferBehind :
                  parseFloat(value);
                newValue = isNaN(newValue) ?
                  defaultMaxBufferBehind :
                  newValue;
                onMaxBufferBehindChange(newValue);
              }}
              value={maxBufferBehindTxt}
              disabled={isMaxBufferBehindLimited === false}
              className="optionInput"
            />
            <Button
              className={
                parseFloat(maxBufferBehindTxt) === defaultMaxBufferBehind
                  ? "resetBtn disabledResetBtn"
                  : "resetBtn"
              }
              ariaLabel="Reset option to default value"
              title="Reset option to default value"
              onClick={() => {
                updateMaxBufferBehindText(String(
                  defaultMaxBufferBehind
                ));
                onMaxBufferBehindChange(defaultMaxBufferBehind);
                setMaxBufferBehindLimit(defaultMaxBufferBehind !== Infinity);
              }}
              value={String.fromCharCode(0xf021)}
            />
          </span>
        </div>
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
