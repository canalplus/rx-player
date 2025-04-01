import * as React from "react";
import Checkbox from "../CheckBox";
import DEFAULT_VALUES from "../../lib/defaultOptionsValues";
import PlayerOptionNumberInput from "./PlayerOptionNumberInput";
import Select from "../Select";

const { Fragment, useCallback, useEffect, useState } = React;

const DEFAULT_SEGMENT_RETRY = DEFAULT_VALUES.loadVideo.requestConfig.segment.maxRetry;
const DEFAULT_SEGMENT_REQUEST_TIMEOUT =
  DEFAULT_VALUES.loadVideo.requestConfig.segment.timeout;
const DEFAULT_MANIFEST_RETRY = DEFAULT_VALUES.loadVideo.requestConfig.manifest.maxRetry;
const DEFAULT_MANIFEST_REQUEST_TIMEOUT =
  DEFAULT_VALUES.loadVideo.requestConfig.manifest.timeout;

/**
 * @param {Object} props
 * @returns {Object}
 */
function RequestConfig({
  manifestRequestTimeout,
  manifestRetry,
  checkManifestIntegrity,
  checkMediaSegmentIntegrity,
  cmcdCommunicationMethod,
  onManifestRequestTimeoutChange,
  onManifestRetryChange,
  onSegmentRequestTimeoutChange,
  onSegmentRetryChange,
  onCheckManifestIntegrityChange,
  onCheckMediaSegmentIntegrityChange,
  onCmcdChange,
  segmentRequestTimeout,
  segmentRetry,
}: {
  manifestRequestTimeout: number;
  manifestRetry: number;
  cmcdCommunicationMethod: string;
  checkMediaSegmentIntegrity: boolean;
  checkManifestIntegrity: boolean;
  onCheckMediaSegmentIntegrityChange: (val: boolean) => void;
  onCheckManifestIntegrityChange: (val: boolean) => void;
  onManifestRequestTimeoutChange: (val: number) => void;
  onManifestRetryChange: (val: number) => void;
  onSegmentRequestTimeoutChange: (val: number) => void;
  onSegmentRetryChange: (val: number) => void;
  onCmcdChange: (val: string) => void;
  segmentRequestTimeout: number;
  segmentRetry: number;
}): React.JSX.Element {
  /* Value of the `segmentRetry` input */
  const [segmentRetryStr, setSegmentRetryStr] = useState(String(segmentRetry));
  /* Value of the `segmentRequestTimeout` input */
  const [segmentRequestTimeoutStr, setSegmentRequestTimeoutStr] = useState(
    String(segmentRequestTimeout),
  );
  /* Value of the `manifestRetry` input */
  const [manifestRetryStr, setManifestRetryStr] = useState(String(manifestRetry));
  /* Value of the `manifestRequestTimeout` input */
  const [manifestRequestTimeoutStr, setManifestRequestTimeoutStr] = useState(
    String(manifestRequestTimeout),
  );
  /*
   * Keep track of the "limit segmentRetry" toggle:
   * `false` == checkbox enabled
   */
  const [isSegmentRetryLimited, setSegmentRetryLimit] = useState(
    segmentRetry !== Infinity,
  );
  /*
   * Keep track of the "limit segmentRequestTimeout" toggle:
   * `false` == checkbox enabled
   */
  const [isSegmentRequestTimeoutLimited, setSegmentRequestTimeoutLimit] = useState(
    segmentRequestTimeout !== -1,
  );
  /*
   * Keep track of the "limit manifestRetry" toggle:
   * `false` == checkbox enabled
   */
  const [isManifestRetryLimited, setManifestRetryLimit] = useState(
    manifestRetry !== Infinity,
  );
  /*
   * Keep track of the "limit manifestRequestTimeout" toggle:
   * `false` == checkbox enabled
   */
  const [isManifestRequestTimeoutLimited, setManifestRequestTimeoutLimit] = useState(
    manifestRequestTimeout !== -1,
  );

  let cmcdDescMsg;
  switch (cmcdCommunicationMethod) {
    case "disabled":
      cmcdDescMsg = "Not relying on CMCD with the CDN";
      break;
    case "query":
      cmcdDescMsg = "Communicate CMCD payload through URL's query strings";
      break;
    case "headers":
      cmcdDescMsg = "Communicate CMCD payload through HTTP(S) headers";
      break;
    default:
      cmcdDescMsg = "Unknown value";
      break;
  }

  const onCmcdSelection = React.useCallback(
    ({ value }: { value: string }) => onCmcdChange(value),
    [onCmcdChange],
  );

  // Update manifestRequestTimeout when its linked text change
  useEffect(() => {
    // Note that this unnecessarily also run on first render - there seem to be
    // no quick and easy way to disable this in react.
    // This is not too problematic so I put up with it.
    let newVal = parseFloat(manifestRequestTimeoutStr);
    newVal = isNaN(newVal) ? DEFAULT_MANIFEST_REQUEST_TIMEOUT : newVal;
    onManifestRequestTimeoutChange(newVal);
  }, [manifestRequestTimeoutStr]);

  // Update manifestRetry when its linked text change
  useEffect(() => {
    let newVal = parseFloat(manifestRetryStr);
    newVal = isNaN(newVal) ? DEFAULT_MANIFEST_RETRY : newVal;
    onManifestRetryChange(newVal);
  }, [manifestRetryStr]);

  // Update segmentRequestTimeout when its linked text change
  useEffect(() => {
    let newVal = parseFloat(segmentRequestTimeoutStr);
    newVal = isNaN(newVal) ? DEFAULT_SEGMENT_REQUEST_TIMEOUT : newVal;
    onSegmentRequestTimeoutChange(newVal);
  }, [segmentRequestTimeoutStr]);

  // Update segmentRetry when its linked text change
  useEffect(() => {
    let newVal = parseFloat(segmentRetryStr);
    newVal = isNaN(newVal) ? DEFAULT_SEGMENT_RETRY : newVal;
    onSegmentRetryChange(newVal);
  }, [segmentRetryStr]);

  const onChangeLimitSegmentRetry = useCallback((isNotLimited: boolean) => {
    if (isNotLimited) {
      setSegmentRetryLimit(false);
      setSegmentRetryStr(String(Infinity));
    } else {
      setSegmentRetryLimit(true);
      setSegmentRetryStr(String(DEFAULT_SEGMENT_RETRY));
    }
  }, []);

  const onChangeLimitSegmentRequestTimeout = useCallback((isNotLimited: boolean) => {
    if (isNotLimited) {
      setSegmentRequestTimeoutLimit(false);
      setSegmentRequestTimeoutStr(String(-1));
    } else {
      setSegmentRequestTimeoutLimit(true);
      setSegmentRequestTimeoutStr(String(DEFAULT_SEGMENT_REQUEST_TIMEOUT));
    }
  }, []);

  const onChangeLimitManifestRetry = useCallback((isNotLimited: boolean) => {
    if (isNotLimited) {
      setManifestRetryLimit(false);
      setManifestRetryStr(String(Infinity));
    } else {
      setManifestRetryLimit(true);
      setManifestRetryStr(String(DEFAULT_MANIFEST_RETRY));
    }
  }, []);

  const onChangeLimitManifestRequestTimeout = useCallback((isNotLimited: boolean) => {
    if (isNotLimited) {
      setManifestRequestTimeoutLimit(false);
      setManifestRequestTimeoutStr(String(-1));
    } else {
      setManifestRequestTimeoutLimit(true);
      setManifestRequestTimeoutStr(String(DEFAULT_MANIFEST_REQUEST_TIMEOUT));
    }
  }, []);

  const onSegmentRetryResetClick = React.useCallback(() => {
    setSegmentRetryStr(String(DEFAULT_SEGMENT_RETRY));
    setSegmentRetryLimit(DEFAULT_SEGMENT_RETRY !== Infinity);
  }, []);

  const onSegmentTimeoutResetClick = React.useCallback(() => {
    setSegmentRequestTimeoutStr(String(DEFAULT_SEGMENT_REQUEST_TIMEOUT));
    setSegmentRequestTimeoutLimit(DEFAULT_SEGMENT_REQUEST_TIMEOUT !== Infinity);
  }, []);

  const onManifestRetryResetClick = React.useCallback(() => {
    setManifestRetryStr(String(DEFAULT_MANIFEST_RETRY));
    setManifestRetryLimit(DEFAULT_MANIFEST_RETRY !== Infinity);
  }, []);

  const onManifestTimeoutResetClick = React.useCallback(() => {
    setManifestRequestTimeoutStr(String(DEFAULT_MANIFEST_REQUEST_TIMEOUT));
    setManifestRequestTimeoutLimit(DEFAULT_MANIFEST_REQUEST_TIMEOUT !== Infinity);
  }, []);

  return (
    <Fragment>
      <li>
        <PlayerOptionNumberInput
          ariaLabel="Segment retry option"
          label="segmentRetry"
          title="Segment Retry"
          valueAsString={segmentRetryStr}
          defaultValueAsNumber={DEFAULT_SEGMENT_RETRY}
          isDisabled={isSegmentRetryLimited === false}
          onUpdateValue={setSegmentRetryStr}
          onResetClick={onSegmentRetryResetClick}
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
          {segmentRetry === Infinity || !isSegmentRetryLimited
            ? 'Retry "retryable" segment requests with no limit'
            : `Retry "retryable" segment requests at most ${segmentRetry} time(s)`}
        </span>
      </li>

      <li>
        <PlayerOptionNumberInput
          ariaLabel="Segment Timeout option"
          label="segmentRequestTimeout"
          title="Segment Timeout"
          valueAsString={segmentRequestTimeoutStr}
          defaultValueAsNumber={DEFAULT_SEGMENT_REQUEST_TIMEOUT}
          isDisabled={isSegmentRequestTimeoutLimited === false}
          onUpdateValue={setSegmentRequestTimeoutStr}
          onResetClick={onSegmentTimeoutResetClick}
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
          {segmentRequestTimeout === -1 || !isSegmentRequestTimeoutLimited
            ? "Perform segment requests without timeout"
            : `Stop segment requests after ${segmentRequestTimeout} millisecond(s)`}
        </span>
      </li>

      <li>
        <PlayerOptionNumberInput
          ariaLabel="manifestRetry option"
          label="manifestRetry"
          title="Manifest Retry"
          valueAsString={manifestRetryStr}
          defaultValueAsNumber={DEFAULT_MANIFEST_RETRY}
          isDisabled={isManifestRetryLimited === false}
          onUpdateValue={setManifestRetryStr}
          onResetClick={onManifestRetryResetClick}
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
          {manifestRetry === Infinity || !isManifestRetryLimited
            ? 'Retry "retryable" manifest requests with no limit'
            : `Retry "retryable" manifest requests at most ${manifestRetry} time(s)`}
        </span>
      </li>
      <li>
        <PlayerOptionNumberInput
          ariaLabel="manifestRequestTimeout option"
          label="manifestRequestTimeout"
          title="Manifest Timeout"
          valueAsString={manifestRequestTimeoutStr}
          defaultValueAsNumber={DEFAULT_MANIFEST_REQUEST_TIMEOUT}
          isDisabled={isManifestRequestTimeoutLimited === false}
          onUpdateValue={setManifestRequestTimeoutStr}
          onResetClick={onManifestTimeoutResetClick}
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
          {manifestRequestTimeout === -1 || !isManifestRequestTimeoutLimited
            ? "Perform manifest requests without timeout"
            : `Stop manifest requests after ${manifestRequestTimeout} millisecond(s)`}
        </span>
      </li>

      <li className="featureWrapperWithSelectMode">
        <Select
          ariaLabel="Selecting the CMCD communication method"
          disabled={false}
          className="playerOptionInput"
          name="cmcd"
          onChange={onCmcdSelection}
          selected={{ value: cmcdCommunicationMethod, index: undefined }}
          options={["disabled", "query", "headers"]}
        >
          CMCD (Common Media Client Data) communication type
        </Select>
        <span className="option-desc">{cmcdDescMsg}</span>
      </li>

      <li>
        <Checkbox
          className="playerOptionsCheckBox playerOptionsCheckBoxTitle"
          ariaLabel="Check segment integrity"
          name="checkMediaSegmentIntegrity"
          checked={checkMediaSegmentIntegrity}
          onChange={onCheckMediaSegmentIntegrityChange}
        >
          Check Media Segment integrity
        </Checkbox>
        <span className="option-desc">
          {checkMediaSegmentIntegrity
            ? "Retry segment requests if those delivered by the CDN appear truncated."
            : "Do not retry request if a segment seems truncated."}
        </span>
      </li>

      <li>
        <Checkbox
          className="playerOptionsCheckBox playerOptionsCheckBoxTitle"
          ariaLabel="Check Manifest integrity"
          name="checkManifestIntegrity"
          checked={checkManifestIntegrity}
          onChange={onCheckManifestIntegrityChange}
        >
          Check Manifest integrity
        </Checkbox>
        <span className="option-desc">
          {checkManifestIntegrity
            ? "Retry Manifest requests if those delivered by the CDN appear truncated."
            : "Do not retry request if a Manifest seems truncated."}
        </span>
      </li>
    </Fragment>
  );
}

export default React.memo(RequestConfig);
