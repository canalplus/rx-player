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
  manifestRequestTimeout,
  manifestRetry,
  offlineRetry,
  onManifestRequestTimeoutChange,
  onManifestRetryChange,
  onOfflineRetryChange,
  onSegmentRequestTimeoutChange,
  onSegmentRetryChange,
  segmentRequestTimeout,
  segmentRetry,
}) {
  const [segmentRetryTxt, updateSegmentRetryText] = useState(
    segmentRetry
  );
  const [segmentRequestTimeoutTxt, updateSegmentRequestTimeoutText] = useState(
    segmentRequestTimeout
  );
  const [manifestRetryTxt, updateManifestRetryText] = useState(
    manifestRetry
  );
  const [offlineRetryTxt, updateOfflineRetryText] = useState(
    offlineRetry
  );
  const [
    manifestRequestTimeoutTxt,
    updateManifestRequestTimeoutText
  ] = useState(
    manifestRequestTimeout
  );
  const [isSegmentRetryLimited, setSegmentRetryLimit] = useState(
    segmentRetry !== Infinity
  );
  const [
    isSegmentRequestTimeoutLimited,
    setSegmentRequestTimeoutLimit
  ] = useState(
    segmentRequestTimeout !== -1
  );
  const [isManifestRetryLimited, setManifestRetryLimit] = useState(
    manifestRetry !== Infinity
  );
  const [isOfflineRetryLimited, setOfflineRetryLimit] = useState(
    offlineRetry !== Infinity
  );

  const [
    isManifestRequestTimeoutLimited,
    setManifestRequestTimeoutLimit
  ] = useState(
    manifestRequestTimeout !== -1
  );

  const defaultSegmentRetry =
    DEFAULT_VALUES.loadVideo.networkConfig.segmentRetry;
  const defaultSegmentRequestTimeout =
    DEFAULT_VALUES.loadVideo.networkConfig.segmentRequestTimeout;
  const defaultManifestRetry =
    DEFAULT_VALUES.loadVideo.networkConfig.manifestRetry;
  const defaultManifestRequestTimeout =
    DEFAULT_VALUES.loadVideo.networkConfig.manifestRequestTimeout;
  const defaultOfflineRetry =
    DEFAULT_VALUES.loadVideo.networkConfig.offlineRetry;
  const onChangeLimitSegmentRetry = (evt) => {
    const isNotLimited = getCheckBoxValue(evt.target);
    if (isNotLimited) {
      setSegmentRetryLimit(false);
      updateSegmentRetryText(String(Infinity));
      onSegmentRetryChange(Infinity);
    } else {
      setSegmentRetryLimit(true);
      updateSegmentRetryText(String(defaultSegmentRetry));
      onSegmentRetryChange(defaultSegmentRetry);
    }
  };

  const onChangeLimitSegmentRequestTimeout = (evt) => {
    const isNotLimited = getCheckBoxValue(evt.target);
    if (isNotLimited) {
      setSegmentRequestTimeoutLimit(false);
      updateSegmentRequestTimeoutText(String(-1));
      onSegmentRequestTimeoutChange(-1);
    } else {
      setSegmentRequestTimeoutLimit(true);
      updateSegmentRequestTimeoutText(String(defaultSegmentRequestTimeout));
      onSegmentRequestTimeoutChange(defaultSegmentRequestTimeout);
    }
  };

  const onChangeLimitManifestRetry = (evt) => {
    const isNotLimited = getCheckBoxValue(evt.target);
    if (isNotLimited) {
      setManifestRetryLimit(false);
      updateManifestRetryText(String(Infinity));
      onManifestRetryChange(Infinity);
    } else {
      setManifestRetryLimit(true);
      updateManifestRetryText(String(defaultManifestRetry));
      onManifestRetryChange(defaultManifestRetry);
    }
  };

  const onChangeLimitOfflineRetry = (evt) => {
    const isNotLimited = getCheckBoxValue(evt.target);
    if (isNotLimited) {
      setOfflineRetryLimit(false);
      updateOfflineRetryText(String(Infinity));
      onOfflineRetryChange(Infinity);
    } else {
      setOfflineRetryLimit(true);
      updateOfflineRetryText(String(defaultOfflineRetry));
      onOfflineRetryChange(defaultOfflineRetry);
    }
  };

  const onChangeLimitManifestRequestTimeout = (evt) => {
    const isNotLimited = getCheckBoxValue(evt.target);
    if (isNotLimited) {
      setManifestRequestTimeoutLimit(false);
      updateManifestRequestTimeoutText(String(-1));
      onManifestRequestTimeoutChange(-1);
    } else {
      setManifestRequestTimeoutLimit(true);
      updateManifestRequestTimeoutText(String(defaultManifestRequestTimeout));
      onManifestRequestTimeoutChange(defaultManifestRequestTimeout);
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
              onChange={(evt) => {
                const { value } = evt.target;
                updateSegmentRetryText(value);
                let newValue = value === "" ?
                  defaultSegmentRetry :
                  parseFloat(value);
                newValue = isNaN(newValue) ?
                  defaultSegmentRetry :
                  newValue;
                onSegmentRetryChange(newValue);
              }}
              value={segmentRetryTxt}
              disabled={isSegmentRetryLimited === false}
              className="optionInput"
            />
            <Button
              className={
                parseFloat(segmentRetryTxt) === defaultSegmentRetry
                  ? "resetBtn disabledResetBtn"
                  : "resetBtn"
              }
              ariaLabel="Reset option to default value"
              title="Reset option to default value"
              onClick={() => {
                updateSegmentRetryText(String(defaultSegmentRetry));
                onSegmentRetryChange(defaultSegmentRetry);
                setSegmentRetryLimit(defaultSegmentRetry !== Infinity);
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
          {segmentRetry === Infinity || !isSegmentRetryLimited ?
            "Retry \"retryable\" segment requests with no limit" :
            `Retry "retryable" segment requests at most ${segmentRetry} time(s)`}
        </span>
      </li>

      <li>
        <div className="playerOptionInput">
          <label htmlFor="segmentRequestTimeout">Segment Timeout</label>
          <span className="wrapperInputWithResetBtn">
            <input
              type="text"
              name="segmentRequestTimeout"
              id="segmentRequestTimeout"
              aria-label="Segment timeout option"
              placeholder="Number"
              onChange={(evt) => {
                const { value } = evt.target;
                updateSegmentRequestTimeoutText(value);
                let newValue = value === "" ?
                  defaultSegmentRequestTimeout :
                  parseFloat(value);
                newValue = isNaN(newValue) ?
                  defaultSegmentRequestTimeout :
                  newValue;
                onSegmentRequestTimeoutChange(newValue);
              }}
              value={segmentRequestTimeout}
              disabled={isSegmentRequestTimeoutLimited === false}
              className="optionInput"
            />
            <Button
              className={
                parseFloat(
                  segmentRequestTimeoutTxt
                ) === defaultSegmentRequestTimeout
                  ? "resetBtn disabledResetBtn"
                  : "resetBtn"
              }
              ariaLabel="Reset option to default value"
              title="Reset option to default value"
              onClick={() => {
                updateSegmentRequestTimeoutText(
                  String(defaultSegmentRequestTimeout)
                );
                onSegmentRequestTimeoutChange(defaultSegmentRequestTimeout);
                setSegmentRequestTimeoutLimit(
                  defaultSegmentRequestTimeout !== Infinity
                );
              }}
              value={String.fromCharCode(0xf021)}
            />
          </span>
        </div>
        <Checkbox
          className="playerOptionsCheckBox"
          ariaLabel="Segment timeout limit option"
          name="segmentRequestTimeoutLimit"
          checked={isSegmentRequestTimeoutLimited === false}
          onChange={onChangeLimitSegmentRequestTimeout}
        >
          Do not limit
        </Checkbox>
        <span className="option-desc">
          {segmentRequestTimeout === -1 || !isSegmentRequestTimeoutLimited ?
            "Perform segment requests without timeout" :
            `Stop segment requests after ${segmentRequestTimeout} millisecond(s)`}
        </span>
      </li>

      <li>
        <div className="playerOptionInput">
          <label htmlFor="manifestRetry">Manifest Retry</label>
          <span className="wrapperInputWithResetBtn">
            <input
              type="text"
              name="manifestRetry"
              id="manifestRetry"
              aria-label="Manifest retry"
              placeholder="Number"
              onChange={(evt) => {
                const { value } = evt.target;
                updateManifestRetryText(value);
                let newValue = value === "" ?
                  defaultManifestRetry :
                  parseFloat(value);
                newValue = isNaN(newValue) ?
                  defaultManifestRetry :
                  newValue;
                onManifestRetryChange(newValue);
              }}
              value={manifestRetryTxt}
              disabled={isManifestRetryLimited === false}
              className="optionInput"
            />
            <Button
              className={
                parseFloat(manifestRetryTxt) === defaultManifestRetry
                  ? "resetBtn disabledResetBtn"
                  : "resetBtn"
              }
              ariaLabel="Reset option to default value"
              title="Reset option to default value"
              onClick={() => {
                updateManifestRetryText(
                  String(defaultManifestRetry)
                );
                onManifestRetryChange(defaultManifestRetry);
                setManifestRetryLimit(defaultManifestRetry !== Infinity);
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
          {manifestRetry === Infinity || !isManifestRetryLimited ?
            "Retry \"retryable\" manifest requests with no limit" :
            `Retry "retryable" manifest requests at most ${manifestRetry} time(s)`}
        </span>
      </li>
      <li>
        <div className="playerOptionInput">
          <label htmlFor="offlineRetry">Offline Retry</label>
          <span className="wrapperInputWithResetBtn">
            <input
              type="text"
              aria-label="Offline retry option"
              name="offlineRetry"
              id="offlineRetry"
              placeholder="Number"
              className="optionInput"
              onChange={(evt) => {
                const { value } = evt.target;
                updateOfflineRetryText(value);
                let newValue = value === "" ?
                  defaultOfflineRetry :
                  parseFloat(value);
                newValue = isNaN(newValue) ?
                  defaultOfflineRetry :
                  newValue;
                onOfflineRetryChange(newValue);
              }}
              value={offlineRetryTxt}
              disabled={isOfflineRetryLimited === false}
            />
            <Button
              className={
                parseFloat(offlineRetryTxt) === defaultOfflineRetry
                  ? "resetBtn disabledResetBtn"
                  : "resetBtn"
              }
              ariaLabel="Reset option to default value"
              title="Reset option to default value"
              onClick={() => {
                updateOfflineRetryText(String(defaultOfflineRetry));
                onOfflineRetryChange(defaultOfflineRetry);
                setOfflineRetryLimit(defaultOfflineRetry !== Infinity);
              }}
              value={String.fromCharCode(0xf021)}
            />
          </span>
        </div>
        <Checkbox
          className="playerOptionsCheckBox"
          ariaLabel="Offline retry limit option"
          name="offlineRetryLimit"
          id="offlineRetryLimit"
          checked={isOfflineRetryLimited === false}
          onChange={onChangeLimitOfflineRetry}
        >
          Do not limit
        </Checkbox>
        <span className="option-desc">
          {offlineRetry === Infinity || !isOfflineRetryLimited ?
            "Retry \"retryable\" requests when offline with no limit" :
            `Retry "retryable" requests when offline at most ${offlineRetry} time(s)`}
        </span>
      </li>

      <li>
        <div className="playerOptionInput">
          <label htmlFor="manifestRequestTimeout">Manifest Timeout</label>
          <span className="wrapperInputWithResetBtn">
            <input
              type="text"
              name="manifestRequestTimeout"
              id="manifestRequestTimeout"
              aria-label="Manifest timeout option"
              placeholder="Number"
              onChange={(evt) => {
                const { value } = evt.target;
                updateManifestRequestTimeoutText(value);
                let newValue = value === "" ?
                  defaultManifestRequestTimeout :
                  parseFloat(value);
                newValue = isNaN(newValue) ?
                  defaultManifestRequestTimeout :
                  newValue;
                onManifestRequestTimeoutChange(newValue);
              }}
              value={manifestRequestTimeout}
              disabled={isManifestRequestTimeoutLimited === false}
              className="optionInput"
            />
            <Button
              className={
                parseFloat(
                  manifestRequestTimeoutTxt
                ) === defaultManifestRequestTimeout
                  ? "resetBtn disabledResetBtn"
                  : "resetBtn"
              }
              ariaLabel="Reset option to default value"
              title="Reset option to default value"
              onClick={() => {
                updateManifestRequestTimeoutText(
                  String(defaultManifestRequestTimeout)
                );
                onManifestRequestTimeoutChange(defaultManifestRequestTimeout);
                setManifestRequestTimeoutLimit(
                  defaultManifestRequestTimeout !== Infinity
                );
              }}
              value={String.fromCharCode(0xf021)}
            />
          </span>
        </div>
        <Checkbox
          className="playerOptionsCheckBox"
          ariaLabel="Manifest timeout limit option"
          name="manifestRequestTimeoutLimit"
          checked={isManifestRequestTimeoutLimited === false}
          onChange={onChangeLimitManifestRequestTimeout}
        >
          Do not limit
        </Checkbox>
        <span className="option-desc">
          {manifestRequestTimeout === -1 || !isManifestRequestTimeoutLimited ?
            "Perform manifest requests without timeout" :
            `Stop manifest requests after ${manifestRequestTimeout} millisecond(s)`}
        </span>
      </li>
    </Fragment>
  );
}

export default React.memo(RequestConfig);
