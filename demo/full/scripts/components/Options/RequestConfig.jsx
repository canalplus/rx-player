import React, { Fragment, useState } from "react";

import getCheckBoxValue from "../../lib/getCheckboxValue";
import Button from "../Button";
import Checkbox from "../CheckBox";
import DEFAULT_VALUES from "../../lib/defaultOptionsValues";

/**
 * @param {Object} props
 * @returns {Object}
 */
function RequestConfig({
  segmentRetry,
  segmentTimeout,
  manifestRetry,
  manifestTimeout,
  onSegmentRetryInput,
  onSegmentTimeoutInput,
  onManifestRetryInput,
  onManifestTimeoutInput,
}) {
  const [isSegmentRetryLimited, setSegmentRetryLimit] = useState(
    segmentRetry !== Infinity
  );
  const [isSegmentTimeoutLimited, setSegmentTimeoutLimit] = useState(
    segmentTimeout !== -1
  );
  const [isManifestRetryLimited, setManifestRetryLimit] = useState(
    manifestRetry !== Infinity
  );
  const [isManifestTimeoutLimited, setManifestTimeoutLimit] = useState(
    manifestTimeout !== -1
  );
  const onChangeLimitSegmentRetry = (evt) => {
    const isNotLimited = getCheckBoxValue(evt.target);
    if (isNotLimited) {
      setSegmentRetryLimit(false);
      onSegmentRetryInput("Infinity");
    } else {
      setSegmentRetryLimit(true);
      onSegmentRetryInput(DEFAULT_VALUES.segmentRetry);
    }
  };

  const onChangeLimitSegmentTimeout = (evt) => {
    const isNotLimited = getCheckBoxValue(evt.target);
    if (isNotLimited) {
      setSegmentTimeoutLimit(false);
      onSegmentTimeoutInput("-1");
    } else {
      setSegmentTimeoutLimit(true);
      onSegmentTimeoutInput(DEFAULT_VALUES.segmentTimeout);
    }
  };

  const onChangeLimitManifestRetry = (evt) => {
    const isNotLimited = getCheckBoxValue(evt.target);
    if (isNotLimited) {
      setManifestRetryLimit(false);
      onManifestRetryInput(Infinity);
    } else {
      setManifestRetryLimit(true);
      onManifestRetryInput(DEFAULT_VALUES.manifestRetry);
    }
  };

  const onChangeLimitManifestTimeout = (evt) => {
    const isNotLimited = getCheckBoxValue(evt.target);
    if (isNotLimited) {
      setManifestTimeoutLimit(false);
      onManifestTimeoutInput("-1");
    } else {
      setManifestTimeoutLimit(true);
      onManifestTimeoutInput(DEFAULT_VALUES.manifestTimeout);
    }
  };

  return (
    <Fragment>
      <li>
        <div className="playerOptionInput">
          <label htmlFor="segmentRetry">Segment Retry</label>
          <span className="wrapperInputWithResetBtn">
            <input
              type="text"
              name="segmentRetry"
              id="segmentRetry"
              aria-label="Segment retry option"
              placeholder="Number"
              onChange={(evt) => onSegmentRetryInput(evt.target.value)}
              value={segmentRetry}
              disabled={isSegmentRetryLimited === false}
              className="optionInput"
            />
            <Button
              className={
                parseFloat(segmentRetry) === DEFAULT_VALUES.segmentRetry
                  ? "resetBtn disabledResetBtn"
                  : "resetBtn"
              }
              ariaLabel="Reset option to default value"
              title="Reset option to default value"
              onClick={() => {
                setSegmentRetryLimit(DEFAULT_VALUES.segmentRetry !==
                  Infinity);
                onSegmentRetryInput(DEFAULT_VALUES.segmentRetry);
              }}
              value={String.fromCharCode(0xf021)}
            />
          </span>
        </div>
        <Checkbox
          className="playerOptionsCheckBox"
          ariaLabel="Segment retry limit option"
          name="segmentRetryLimit"
          checked={isSegmentRetryLimited === false}
          onChange={onChangeLimitSegmentRetry}
        >
          Do not limit
        </Checkbox>
        <span className="option-desc">
          {parseFloat(segmentRetry) === Infinity || !isSegmentRetryLimited ?
            "Retry \"retryable\" segment requests with no limit" :
            `Retry "retryable" segment requests at most ${segmentRetry} time(s)`}
        </span>
      </li>

      <li>
        <div className="playerOptionInput">
          <label htmlFor="segmentTimeout">Segment Timeout</label>
          <span className="wrapperInputWithResetBtn">
            <input
              type="text"
              name="segmentTimeout"
              id="segmentTimeout"
              aria-label="Segment timeout option"
              placeholder="Number"
              onChange={(evt) => onSegmentTimeoutInput(evt.target.value)}
              value={segmentTimeout}
              disabled={isSegmentTimeoutLimited === false}
              className="optionInput"
            />
            <Button
              className={
                parseFloat(segmentTimeout) === DEFAULT_VALUES.segmentTimeout
                  ? "resetBtn disabledResetBtn"
                  : "resetBtn"
              }
              ariaLabel="Reset option to default value"
              title="Reset option to default value"
              onClick={() => {
                setSegmentTimeoutLimit(DEFAULT_VALUES.segmentTimeout !==
                  Infinity);
                onSegmentTimeoutInput(DEFAULT_VALUES.segmentTimeout);
              }}
              value={String.fromCharCode(0xf021)}
            />
          </span>
        </div>
        <Checkbox
          className="playerOptionsCheckBox"
          ariaLabel="Segment timeout limit option"
          name="segmentTimeoutLimit"
          checked={isSegmentTimeoutLimited === false}
          onChange={onChangeLimitSegmentTimeout}
        >
          Do not limit
        </Checkbox>
        <span className="option-desc">
          {parseFloat(segmentTimeout) === -1 || !isSegmentTimeoutLimited ?
            "Perform segment requests without timeout" :
            `Stop segment requests after ${segmentTimeout} millisecond(s)`}
        </span>
      </li>

      <li>
        <div className="playerOptionInput">
          <label htmlFor="manifestRetry">Manifest Retry</label>
          <span className="wrapperInputWithResetBtn">
            <input
              type="text"
              name="manifestRetry"
              id="segmentRetry"
              aria-label="Manifest retry"
              placeholder="Number"
              onChange={(evt) => onManifestRetryInput(evt.target.value)}
              value={manifestRetry}
              disabled={isManifestRetryLimited === false}
              className="optionInput"
            />
            <Button
              className={
                parseFloat(manifestRetry) === DEFAULT_VALUES.manifestRetry
                  ? "resetBtn disabledResetBtn"
                  : "resetBtn"
              }
              ariaLabel="Reset option to default value"
              title="Reset option to default value"
              onClick={() => {
                setManifestRetryLimit(DEFAULT_VALUES.manifestRetry !==
                  Infinity);
                onManifestRetryInput(DEFAULT_VALUES.manifestRetry);
              }}
              value={String.fromCharCode(0xf021)}
            />
          </span>
        </div>
        <Checkbox
          className="playerOptionsCheckBox"
          ariaLabel="Manifest retry limit option"
          name="manifestRetryLimit"
          checked={isManifestRetryLimited === false}
          onChange={onChangeLimitManifestRetry}
        >
          Do not limit
        </Checkbox>
        <span className="option-desc">
          {parseFloat(manifestRetry) === Infinity || !isManifestRetryLimited ?
            "Retry \"retryable\" manifest requests with no limit" :
            `Retry "retryable" manifest requests at most ${manifestRetry} time(s)`}
        </span>
      </li>
      <li>
        <div className="playerOptionInput">
          <label htmlFor="manifestTimeout">Manifest Timeout</label>
          <span className="wrapperInputWithResetBtn">
            <input
              type="text"
              name="manifestTimeout"
              id="manifestTimeout"
              aria-label="Manifest timeout option"
              placeholder="Number"
              onChange={(evt) => onManifestTimeoutInput(evt.target.value)}
              value={manifestTimeout}
              disabled={isManifestTimeoutLimited === false}
              className="optionInput"
            />
            <Button
              className={
                parseFloat(manifestTimeout) === DEFAULT_VALUES.manifestTimeout
                  ? "resetBtn disabledResetBtn"
                  : "resetBtn"
              }
              ariaLabel="Reset option to default value"
              title="Reset option to default value"
              onClick={() => {
                setManifestTimeoutLimit(DEFAULT_VALUES.manifestTimeout !==
                  Infinity);
                onManifestTimeoutInput(DEFAULT_VALUES.manifestTimeout);
              }}
              value={String.fromCharCode(0xf021)}
            />
          </span>
        </div>
        <Checkbox
          className="playerOptionsCheckBox"
          ariaLabel="Manifest timeout limit option"
          name="manifestTimeoutLimit"
          checked={isManifestTimeoutLimited === false}
          onChange={onChangeLimitManifestTimeout}
        >
          Do not limit
        </Checkbox>
        <span className="option-desc">
          {parseFloat(manifestTimeout) === -1 || !isManifestTimeoutLimited ?
            "Perform manifest requests without timeout" :
            `Stop manifest requests after ${manifestTimeout} millisecond(s)`}
        </span>
      </li>

      <li>
        <div className="playerOptionInput">
          <label htmlFor="manifestTimeout">Manifest Timeout</label>
          <span className="wrapperInputWithResetBtn">
            <input
              type="text"
              name="manifestTimeout"
              id="manifestTimeout"
              aria-label="Manifest timeout option"
              placeholder="Number"
              onChange={(evt) => onManifestTimeoutInput(evt.target.value)}
              value={manifestTimeout}
              disabled={isManifestTimeoutLimited === false}
              className="optionInput"
            />
            <Button
              className={
                parseFloat(manifestTimeout) === DEFAULT_VALUES.manifestTimeout
                  ? "resetBtn disabledResetBtn"
                  : "resetBtn"
              }
              ariaLabel="Reset option to default value"
              title="Reset option to default value"
              onClick={() => {
                setManifestTimeoutLimit(DEFAULT_VALUES.manifestTimeout !==
                  Infinity);
                onManifestTimeoutInput(DEFAULT_VALUES.manifestTimeout);
              }}
              value={String.fromCharCode(0xf021)}
            />
          </span>
        </div>
        <Checkbox
          className="playerOptionsCheckBox"
          ariaLabel="Manifest timeout limit option"
          name="manifestTimeoutLimit"
          checked={isManifestTimeoutLimited === false}
          onChange={onChangeLimitManifestTimeout}
        >
          Do not limit
        </Checkbox>
        <span className="option-desc">
          {parseFloat(manifestTimeout) === -1 || !isManifestTimeoutLimited ?
            "Perform manifest requests without timeout" :
            `Stop manifest requests after ${manifestTimeout} millisecond(s)`}
        </span>
      </li>
    </Fragment>
  );
}

export default React.memo(RequestConfig);
