import React, { Fragment, useCallback, useEffect, useState } from "react";
import getCheckBoxValue from "../../lib/getCheckboxValue";
import Checkbox from "../CheckBox";
import DEFAULT_VALUES from "../../lib/defaultOptionsValues";
import PlayerOptionNumberInput from "./PlayerOptionNumberInput";

const defaultSegmentRetry =
  DEFAULT_VALUES.loadVideo.networkConfig.segmentRetry;
const defaultSegmentRequestTimeout =
  DEFAULT_VALUES.loadVideo.networkConfig.segmentRequestTimeout;
const defaultManifestRetry =
  DEFAULT_VALUES.loadVideo.networkConfig.manifestRetry;
const defaultManifestRequestTimeout =
  DEFAULT_VALUES.loadVideo.networkConfig.manifestRequestTimeout;

/**
 * @param {Object} props
 * @returns {Object}
 */
function RequestConfig({
  manifestRequestTimeout,
  manifestRetry,
  onManifestRequestTimeoutChange,
  onManifestRetryChange,
  onSegmentRequestTimeoutChange,
  onSegmentRetryChange,
  segmentRequestTimeout,
  segmentRetry,
}) {
  /* Value of the `segmentRetry` input */
  const [segmentRetryStr, setSegmentRetryStr] = useState(
    segmentRetry
  );
  /* Value of the `segmentRequestTimeout` input */
  const [segmentRequestTimeoutStr, setSegmentRequestTimeoutStr] = useState(
    segmentRequestTimeout
  );
  /* Value of the `manifestRetry` input */
  const [manifestRetryStr, setManifestRetryStr] = useState(
    manifestRetry
  );
  /* Value of the `manifestRequestTimeout` input */
  const [
    manifestRequestTimeoutStr,
    setManifestRequestTimeoutStr
  ] = useState(
    manifestRequestTimeout
  );
  /*
   * Keep track of the "limit segmentRetry" toggle:
   * `false` == checkbox enabled
   */
  const [isSegmentRetryLimited, setSegmentRetryLimit] = useState(
    segmentRetry !== Infinity
  );
  /*
   * Keep track of the "limit segmentRequestTimeout" toggle:
   * `false` == checkbox enabled
   */
  const [
    isSegmentRequestTimeoutLimited,
    setSegmentRequestTimeoutLimit
  ] = useState(
    segmentRequestTimeout !== -1
  );
  /*
   * Keep track of the "limit manifestRetry" toggle:
   * `false` == checkbox enabled
   */
  const [isManifestRetryLimited, setManifestRetryLimit] = useState(
    manifestRetry !== Infinity
  );
  /*
   * Keep track of the "limit manifestRequestTimeout" toggle:
   * `false` == checkbox enabled
   */
  const [
    isManifestRequestTimeoutLimited,
    setManifestRequestTimeoutLimit
  ] = useState(
    manifestRequestTimeout !== -1
  );

  // Update manifestRequestTimeout when its linked text change
  useEffect(() => {
    // Note that this unnecessarily also run on first render - there seem to be
    // no quick and easy way to disable this in react.
    // This is not too problematic so I put up with it.
    let newVal = parseFloat(manifestRequestTimeoutStr);
    newVal = isNaN(newVal) ?
      defaultManifestRequestTimeout :
      newVal;
    onManifestRequestTimeoutChange(newVal);
  }, [manifestRequestTimeoutStr]);

  // Update manifestRetry when its linked text change
  useEffect(() => {
    let newVal = parseFloat(manifestRetryStr);
    newVal = isNaN(newVal) ?
      defaultManifestRetry :
      newVal;
    onManifestRetryChange(newVal);
  }, [manifestRetryStr]);

  // Update segmentRequestTimeout when its linked text change
  useEffect(() => {
    let newVal = parseFloat(segmentRequestTimeoutStr);
    newVal = isNaN(newVal) ?
      defaultSegmentRequestTimeout :
      newVal;
    onSegmentRequestTimeoutChange(newVal);
  }, [segmentRequestTimeoutStr]);

  // Update segmentRetry when its linked text change
  useEffect(() => {
    let newVal = parseFloat(segmentRetryStr);
    newVal = isNaN(newVal) ?
      defaultSegmentRetry :
      newVal;
    onSegmentRetryChange(newVal);
  }, [segmentRetryStr]);

  const onChangeLimitSegmentRetry = useCallback((evt) => {
    const isNotLimited = getCheckBoxValue(evt.target);
    if (isNotLimited) {
      setSegmentRetryLimit(false);
      setSegmentRetryStr(String(Infinity));
    } else {
      setSegmentRetryLimit(true);
      setSegmentRetryStr(String(defaultSegmentRetry));
    }
  }, []);

  const onChangeLimitSegmentRequestTimeout = useCallback((evt) => {
    const isNotLimited = getCheckBoxValue(evt.target);
    if (isNotLimited) {
      setSegmentRequestTimeoutLimit(false);
      setSegmentRequestTimeoutStr(String(-1));
    } else {
      setSegmentRequestTimeoutLimit(true);
      setSegmentRequestTimeoutStr(String(defaultSegmentRequestTimeout));
    }
  }, []);

  const onChangeLimitManifestRetry = useCallback((evt) => {
    const isNotLimited = getCheckBoxValue(evt.target);
    if (isNotLimited) {
      setManifestRetryLimit(false);
      setManifestRetryStr(String(Infinity));
    } else {
      setManifestRetryLimit(true);
      setManifestRetryStr(String(defaultManifestRetry));
    }
  }, []);


  const onChangeLimitManifestRequestTimeout = useCallback((evt) => {
    const isNotLimited = getCheckBoxValue(evt.target);
    if (isNotLimited) {
      setManifestRequestTimeoutLimit(false);
      setManifestRequestTimeoutStr(String(-1));
    } else {
      setManifestRequestTimeoutLimit(true);
      setManifestRequestTimeoutStr(String(defaultManifestRequestTimeout));
    }
  }, []);

  return (
    <Fragment>
      <li>
        <PlayerOptionNumberInput
          ariaLabel="Segment retry option"
          label="segmentRetry"
          title="Segment Retry"
          valueAsString={segmentRetryStr}
          defaultValueAsNumber={defaultSegmentRetry}
          isDisabled={isSegmentRetryLimited === false}
          onUpdateValue={setSegmentRetryStr}
          onResetClick={() => {
            setSegmentRetryStr(String(defaultSegmentRetry));
            setSegmentRetryLimit(defaultSegmentRetry !== Infinity);
          }}
        />
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
        <PlayerOptionNumberInput
          ariaLabel="Segment Timeout option"
          label="segmentRequestTimeout"
          title="Segment Timeout"
          valueAsString={segmentRequestTimeoutStr}
          defaultValueAsNumber={defaultSegmentRequestTimeout}
          isDisabled={isSegmentRequestTimeoutLimited === false}
          onUpdateValue={setSegmentRequestTimeoutStr}
          onResetClick={() => {
            setSegmentRequestTimeoutStr(String(defaultSegmentRequestTimeout));
            setSegmentRequestTimeoutLimit(
              defaultSegmentRequestTimeout !== Infinity
            );
          }}
        />
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
        <PlayerOptionNumberInput
          ariaLabel="manifestRetry option"
          label="manifestRetry"
          title="Manifest Retry"
          valueAsString={manifestRetryStr}
          defaultValueAsNumber={defaultManifestRetry}
          isDisabled={isManifestRetryLimited === false}
          onUpdateValue={setManifestRetryStr}
          onResetClick={() => {
            setManifestRetryStr(String(defaultManifestRetry));
            setManifestRetryLimit(defaultManifestRetry !== Infinity);
          }}
        />
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
        <PlayerOptionNumberInput
          ariaLabel="manifestRequestTimeout option"
          label="manifestRequestTimeout"
          title="Manifest Timeout"
          valueAsString={manifestRequestTimeoutStr}
          defaultValueAsNumber={defaultManifestRequestTimeout}
          isDisabled={isManifestRequestTimeoutLimited === false}
          onUpdateValue={setManifestRequestTimeoutStr}
          onResetClick={() => {
            setManifestRequestTimeoutStr(String(defaultManifestRequestTimeout));
            setManifestRequestTimeoutLimit(
              defaultManifestRequestTimeout !== Infinity
            );
          }}
        />
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
