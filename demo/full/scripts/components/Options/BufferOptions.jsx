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
  maxBufferAhead,
  maxBufferBehind,
  onWantedBufferAheadInput,
  onMaxBufferAheadInput,
  onMaxBufferBehindInput,
}) {
  const [isMaxBufferAHeadLimited, setMaxBufferAHeadLimit] = useState(
    maxBufferAhead !== Infinity
  );
  const [isMaxBufferBehindLimited, setMaxBufferBehindLimit] = useState(
    maxBufferBehind !== Infinity
  );

  const onChangeLimitMaxBufferAHead = (evt) => {
    const isNotLimited = getCheckBoxValue(evt.target);
    if (isNotLimited) {
      setMaxBufferAHeadLimit(false);
      onMaxBufferAheadInput(Infinity);
    } else {
      setMaxBufferAHeadLimit(true);
      onMaxBufferAheadInput(DEFAULT_VALUES.maxBufferAhead);
    }
  };

  const onChangeLimitMaxBufferBehind = (evt) => {
    const isNotLimited = getCheckBoxValue(evt.target);
    if (isNotLimited) {
      setMaxBufferBehindLimit(false);
      onMaxBufferBehindInput(Infinity);
    } else {
      setMaxBufferBehindLimit(true);
      onMaxBufferAheadInput(DEFAULT_VALUES.maxBufferBehind);
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
              onChange={(evt) => onWantedBufferAheadInput(evt.target.value)}
              value={wantedBufferAhead}
              className="optionInput"
            />
            <Button
              className={
                parseFloat(wantedBufferAhead) ===
                  DEFAULT_VALUES.wantedBufferAhead
                  ? "resetBtn disabledResetBtn"
                  : "resetBtn"
              }
              ariaLabel="Reset option to default value"
              title="Reset option to default value"
              onClick={() => {
                onWantedBufferAheadInput(DEFAULT_VALUES.wantedBufferAhead);
              }}
              value={String.fromCharCode(0xf021)}
            />
          </span>
        </div>
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
              onChange={(evt) => onMaxBufferAheadInput(evt.target.value)}
              value={maxBufferAhead}
              disabled={isMaxBufferAHeadLimited === false}
              className="optionInput"
            />
            <Button
              className={
                parseFloat(maxBufferAhead) === DEFAULT_VALUES.maxBufferAhead
                  ? "resetBtn disabledResetBtn"
                  : "resetBtn"
              }
              ariaLabel="Reset option to default value"
              title="Reset option to default value"
              onClick={() => {
                setMaxBufferAHeadLimit(DEFAULT_VALUES.maxBufferAhead !==
                  Infinity);
                onMaxBufferAheadInput(DEFAULT_VALUES.maxBufferAhead);
              }}
              value={String.fromCharCode(0xf021)}
            />
          </span>
        </div>
        <Checkbox
          className="playerOptionsCheckBox"
          ariaLabel="Do not limit max buffer a head option"
          name="maxBufferAheadLimit"
          checked={isMaxBufferAHeadLimited === false}
          onChange={onChangeLimitMaxBufferAHead}
        >
          Do not limit
        </Checkbox>
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
              onChange={(evt) => onMaxBufferBehindInput(evt.target.value)}
              value={maxBufferBehind}
              disabled={isMaxBufferBehindLimited === false}
              className="optionInput"
            />
            <Button
              className={
                parseFloat(maxBufferBehind) === DEFAULT_VALUES.maxBufferBehind
                  ? "resetBtn disabledResetBtn"
                  : "resetBtn"
              }
              ariaLabel="Reset option to default value"
              title="Reset option to default value"
              onClick={() => {
                setMaxBufferBehindLimit(DEFAULT_VALUES.maxBufferBehind !==
                  Infinity);
                onMaxBufferBehindInput(DEFAULT_VALUES.maxBufferBehind);
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
      </li>
    </Fragment>
  );
}

export default React.memo(BufferOptions);
