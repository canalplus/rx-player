import * as React from "react";
import Checkbox from "../CheckBox";
import DEFAULT_VALUES from "../../lib/defaultOptionsValues";
import PlayerOptionNumberInput from "./PlayerOptionNumberInput";

const { Fragment, useCallback, useEffect, useState } = React;

const DEFAULT_MAX_BUFFER_AHEAD = DEFAULT_VALUES.player.maxBufferAhead;
const DEFAULT_MAX_BUFFER_BEHIND = DEFAULT_VALUES.player.maxBufferBehind;
const DEFAULT_MAX_VIDEO_BUFFER_SIZE = DEFAULT_VALUES.player.maxVideoBufferSize;
const DEFAULT_WANTED_BUFFER_AHEAD = DEFAULT_VALUES.player.wantedBufferAhead;
const DEFAULT_REBUFFERING_AVOIDANCE_BUFFER_GAP_SIZE =
  DEFAULT_VALUES.loadVideo.experimentalOptions
    .playbackRateBasedRebufferingAvoidanceSettings.onBufferGapSize;
const DEFAULT_REBUFFERING_AVOIDANCE_MIN_PLAYBACK_RATE =
  DEFAULT_VALUES.loadVideo.experimentalOptions
    .playbackRateBasedRebufferingAvoidanceSettings.minPlaybackRate;

/**
 * @param {Object} props
 * @returns {Object}
 */
function BufferOptions({
  wantedBufferAhead,
  maxVideoBufferSize,
  maxBufferAhead,
  maxBufferBehind,
  rebufferingAvoidanceBufferGapSize,
  rebufferingAvoidanceMinPlaybackRate,
  onWantedBufferAheadChange,
  onMaxVideoBufferSizeChange,
  onMaxBufferAheadChange,
  onMaxBufferBehindChange,
  onRebufferingAvoidanceBufferGapSizeChange,
  onRebufferingAvoidanceMinPlaybackRateChange,
}: {
  wantedBufferAhead: number;
  maxVideoBufferSize: number;
  maxBufferAhead: number;
  maxBufferBehind: number;
  rebufferingAvoidanceBufferGapSize: number;
  rebufferingAvoidanceMinPlaybackRate: number;
  onWantedBufferAheadChange: (newVal: number) => void;
  onMaxVideoBufferSizeChange: (newVal: number) => void;
  onMaxBufferBehindChange: (newVal: number) => void;
  onMaxBufferAheadChange: (newVal: number) => void;
  onRebufferingAvoidanceBufferGapSizeChange: (newVal: number) => void;
  onRebufferingAvoidanceMinPlaybackRateChange: (newVal: number) => void;
}): JSX.Element {
  /* Value of the `wantedBufferAhead` input */
  const [wantedBufferAheadStr, setWantedBufferAheadStr] = useState(
    String(wantedBufferAhead),
  );
  /* Value of the `maxVideoBufferSize` input */
  const [maxVideoBufferSizeStr, setMaxVideoBufferSizeStr] = useState(
    String(maxVideoBufferSize),
  );
  /* Value of the `maxBufferBehind` input */
  const [maxBufferBehindStr, setMaxBufferBehindStr] = useState(String(maxBufferBehind));
  /* Value of the `maxBufferAhead` input */
  const [maxBufferAheadStr, setMaxBufferAheadStr] = useState(String(maxBufferAhead));
  /* Value of the `rebufferingAvoidanceBufferGapSize` input */
  const [rebufferingAvoidanceBufferGapSizeStr, setRebufferingAvoidanceBufferGapSizeStr] =
    useState(String(rebufferingAvoidanceBufferGapSize));
  /* Value of the `rebufferingAvoidanceMinPlaybackRate` input */
  const [
    rebufferingAvoidanceMinPlaybackRateStr,
    setRebufferingAvoidanceMinPlaybackRateStr,
  ] = useState(String(rebufferingAvoidanceMinPlaybackRate));
  /*
   * Keep track of the "limit maxBufferAhead" toggle:
   * `false` == checkbox enabled
   */
  const [isMaxBufferAheadLimited, setMaxBufferAheadLimit] = useState(
    maxBufferAhead !== Infinity,
  );
  /*
   * Keep track of the "limit maxBufferBehind" toggle:
   * `false` == checkbox enabled
   */
  const [isMaxBufferBehindLimited, setMaxBufferBehindLimit] = useState(
    maxBufferBehind !== Infinity,
  );
  /*
   * Keep track of the "limit maxVideoBufferSize" toggle:
   * `false` == checkbox enabled
   */
  const [isMaxVideoBufferSizeLimited, setMaxVideoBufferSizeLimit] = useState(
    maxVideoBufferSize !== Infinity,
  );
  const isRebufferingAvoidanceEnabled = rebufferingAvoidanceBufferGapSize !== 0;

  // Update `wantedBufferAhead` when its linked text change
  useEffect(() => {
    // Note that this unnecessarily also run on first render - there seem to be
    // no quick and easy way to disable this in react.
    // This is not too problematic so I put up with it.
    let newVal = parseFloat(wantedBufferAheadStr);
    newVal = isNaN(newVal) ? DEFAULT_WANTED_BUFFER_AHEAD : newVal;
    onWantedBufferAheadChange(newVal);
  }, [wantedBufferAheadStr]);

  // Update `maxVideoBufferSize` when its linked text change
  useEffect(() => {
    let newVal = parseFloat(maxVideoBufferSizeStr);
    newVal = isNaN(newVal) ? DEFAULT_MAX_VIDEO_BUFFER_SIZE : newVal;
    onMaxVideoBufferSizeChange(newVal);
  }, [maxVideoBufferSizeStr]);

  // Update `maxBufferAhead` when its linked text change
  useEffect(() => {
    let newVal = parseFloat(maxBufferAheadStr);
    newVal = isNaN(newVal) ? DEFAULT_MAX_BUFFER_AHEAD : newVal;
    onMaxBufferAheadChange(newVal);
  }, [maxBufferAheadStr]);

  // Update `maxBufferBehind` when its linked text change
  useEffect(() => {
    let newVal = parseFloat(maxBufferBehindStr);
    newVal = isNaN(newVal) ? DEFAULT_MAX_BUFFER_BEHIND : newVal;
    onMaxBufferBehindChange(newVal);
  }, [maxBufferBehindStr]);

  // Update `rebufferingAvoidanceBufferGapSize` when its linked text change
  useEffect(() => {
    // Note that this unnecessarily also run on first render - there seem to be
    // no quick and easy way to disable this in react.
    // This is not too problematic so I put up with it.
    let newVal = parseFloat(rebufferingAvoidanceBufferGapSizeStr);
    newVal = isNaN(newVal) ? DEFAULT_REBUFFERING_AVOIDANCE_BUFFER_GAP_SIZE : newVal;
    onRebufferingAvoidanceBufferGapSizeChange(newVal);
  }, [rebufferingAvoidanceBufferGapSizeStr]);

  // Update `rebufferingAvoidanceMinPlaybackRate` when its linked text change
  useEffect(() => {
    // Note that this unnecessarily also run on first render - there seem to be
    // no quick and easy way to disable this in react.
    // This is not too problematic so I put up with it.
    let newVal = parseFloat(rebufferingAvoidanceMinPlaybackRateStr);
    newVal = isNaN(newVal) ? DEFAULT_REBUFFERING_AVOIDANCE_MIN_PLAYBACK_RATE : newVal;
    onRebufferingAvoidanceMinPlaybackRateChange(newVal);
  }, [rebufferingAvoidanceMinPlaybackRateStr]);

  const onChangeLimitMaxBufferAhead = useCallback((isNotLimited: boolean) => {
    if (isNotLimited) {
      setMaxBufferAheadLimit(false);
      setMaxBufferAheadStr(String(Infinity));
    } else {
      setMaxBufferAheadLimit(true);
      setMaxBufferAheadStr(String(DEFAULT_MAX_BUFFER_AHEAD));
    }
  }, []);

  const onChangeLimitMaxBufferBehind = useCallback((isNotLimited: boolean) => {
    if (isNotLimited) {
      setMaxBufferBehindLimit(false);
      setMaxBufferBehindStr(String(DEFAULT_MAX_BUFFER_AHEAD));
    } else {
      setMaxBufferBehindLimit(true);
      setMaxBufferBehindStr(String(DEFAULT_MAX_BUFFER_BEHIND));
    }
  }, []);

  const onChangeLimitMaxVideoBufferSize = useCallback((isNotLimited: boolean) => {
    if (isNotLimited) {
      setMaxVideoBufferSizeLimit(false);
      setMaxVideoBufferSizeStr(String(Infinity));
    } else {
      setMaxVideoBufferSizeLimit(true);
      setMaxVideoBufferSizeStr(String(DEFAULT_MAX_VIDEO_BUFFER_SIZE));
    }
  }, []);

  const onRebufferingAvoidanceEnableClick = useCallback((isEnabled: boolean) => {
    if (isEnabled) {
      setRebufferingAvoidanceBufferGapSizeStr("0");
    } else {
      setRebufferingAvoidanceBufferGapSizeStr("1.5");
    }
  }, []);

  const onWantedBufferAheadResetClick = React.useCallback(() => {
    setWantedBufferAheadStr(String(DEFAULT_WANTED_BUFFER_AHEAD));
  }, []);

  const onMaxVideoBufferSizeResetClick = React.useCallback(() => {
    setMaxVideoBufferSizeStr(String(DEFAULT_MAX_VIDEO_BUFFER_SIZE));
    setMaxVideoBufferSizeLimit(DEFAULT_MAX_VIDEO_BUFFER_SIZE !== Infinity);
  }, []);

  const onMaxBufferAheadResetClick = React.useCallback(() => {
    setMaxBufferAheadStr(String(DEFAULT_MAX_BUFFER_AHEAD));
    setMaxBufferAheadLimit(DEFAULT_MAX_BUFFER_AHEAD !== Infinity);
  }, []);

  const onMaxBufferBehindResetClick = React.useCallback(() => {
    setMaxBufferBehindStr(String(DEFAULT_MAX_BUFFER_BEHIND));
    setMaxBufferBehindLimit(DEFAULT_MAX_BUFFER_BEHIND !== Infinity);
  }, []);

  const onRebufferingAvoidanceBufferGapSizeResetClick = React.useCallback(() => {
    setRebufferingAvoidanceBufferGapSizeStr(
      String(DEFAULT_REBUFFERING_AVOIDANCE_BUFFER_GAP_SIZE),
    );
  }, []);

  const onRebufferingAvoidanceMinPlaybackRateResetClick = React.useCallback(() => {
    setRebufferingAvoidanceMinPlaybackRateStr(
      String(DEFAULT_REBUFFERING_AVOIDANCE_MIN_PLAYBACK_RATE),
    );
  }, []);

  return (
    <Fragment>
      <li>
        <PlayerOptionNumberInput
          ariaLabel="Wanted Buffer Ahead option"
          label="wantedBufferAhead"
          title="Wanted Buffer Ahead"
          valueAsString={wantedBufferAheadStr}
          defaultValueAsNumber={DEFAULT_WANTED_BUFFER_AHEAD}
          isDisabled={false}
          onUpdateValue={setWantedBufferAheadStr}
          onResetClick={onWantedBufferAheadResetClick}
        />
        <span className="option-desc">
          Buffering around {wantedBufferAhead} second(s) ahead of the current position
        </span>
      </li>
      <li>
        <PlayerOptionNumberInput
          ariaLabel="maxVideoBufferSize option"
          label="maxVideoBufferSize"
          title="Max Video Buffer Size"
          valueAsString={maxVideoBufferSizeStr}
          defaultValueAsNumber={DEFAULT_MAX_VIDEO_BUFFER_SIZE}
          isDisabled={isMaxVideoBufferSizeLimited === false}
          onUpdateValue={setMaxVideoBufferSizeStr}
          onResetClick={onMaxVideoBufferSizeResetClick}
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
          {maxVideoBufferSize === Infinity || !isMaxVideoBufferSizeLimited
            ? "Not setting a size limit to the video buffer (relying only on the wantedBufferAhead option)"
            : `Buffering at most around ${maxVideoBufferSize} kilobyte(s) on the video buffer`}
        </span>
      </li>
      <li>
        <PlayerOptionNumberInput
          ariaLabel="maxBufferAhead option"
          label="maxBufferAhead"
          title="Max Buffer Ahead"
          valueAsString={maxBufferAheadStr}
          defaultValueAsNumber={DEFAULT_MAX_BUFFER_AHEAD}
          isDisabled={isMaxBufferAheadLimited === false}
          onUpdateValue={setMaxBufferAheadStr}
          onResetClick={onMaxBufferAheadResetClick}
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
          {maxBufferAhead === Infinity || !isMaxBufferAheadLimited
            ? "Not manually cleaning buffer far ahead of the current position"
            : `Manually cleaning data ${maxBufferAhead} second(s) ahead of the current position`}
        </span>
      </li>
      <li>
        <PlayerOptionNumberInput
          ariaLabel="maxBufferBehind option"
          label="maxBufferBehind"
          title="Max Buffer Behind"
          valueAsString={maxBufferBehindStr}
          defaultValueAsNumber={DEFAULT_MAX_BUFFER_BEHIND}
          isDisabled={isMaxBufferBehindLimited === false}
          onUpdateValue={setMaxBufferBehindStr}
          onResetClick={onMaxBufferBehindResetClick}
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
          {maxBufferBehind === Infinity || !isMaxBufferBehindLimited
            ? "Not manually cleaning buffer behind the current position"
            : `Manually cleaning data ${maxBufferBehind} second(s) behind the current position`}
        </span>
      </li>
      <li>
        <PlayerOptionNumberInput
          ariaLabel="Playback Rate Based Rebuffering Avoidance Buffer Size option"
          label="playbackRateBasedRebufferingAvoidanceBufferSize"
          title="Rebuffering Avoidance: Buffer Size"
          valueAsString={rebufferingAvoidanceBufferGapSizeStr}
          defaultValueAsNumber={DEFAULT_REBUFFERING_AVOIDANCE_BUFFER_GAP_SIZE}
          isDisabled={!isRebufferingAvoidanceEnabled}
          onUpdateValue={setRebufferingAvoidanceBufferGapSizeStr}
          onResetClick={onRebufferingAvoidanceBufferGapSizeResetClick}
        />
        <Checkbox
          className="playerOptionsCheckBox"
          ariaLabel="Do not enable Playback Rate-Based Rebuffering Avoidance"
          name="rebufferingAvoidanceEnable"
          checked={!isRebufferingAvoidanceEnabled}
          onChange={onRebufferingAvoidanceEnableClick}
        >
          Disable
        </Checkbox>
        <span className="option-desc">
          {rebufferingAvoidanceBufferGapSize <= 0 || !isRebufferingAvoidanceEnabled
            ? "No triggering Playback-Rate-based rebuffering Avoidance"
            : `Starting rebuffering avoidance strategy once ${rebufferingAvoidanceBufferGapSize} second(s) is left in the buffer`}
        </span>
        <PlayerOptionNumberInput
          ariaLabel="Playback Rate Based Rebuffering Avoidance Min Playback Rate option"
          label="playbackRateBasedRebufferingAvoidanceMinPlaybackRate"
          title="Rebuffering Avoidance: Playback Rate"
          valueAsString={rebufferingAvoidanceMinPlaybackRateStr}
          defaultValueAsNumber={DEFAULT_REBUFFERING_AVOIDANCE_MIN_PLAYBACK_RATE}
          isDisabled={!isRebufferingAvoidanceEnabled}
          onUpdateValue={setRebufferingAvoidanceMinPlaybackRateStr}
          onResetClick={onRebufferingAvoidanceMinPlaybackRateResetClick}
        />
        <span className="option-desc">
          {rebufferingAvoidanceBufferGapSize <= 0 || !isRebufferingAvoidanceEnabled
            ? "No triggering Playback-Rate-based rebuffering Avoidance"
            : `Rebuffering avoidance strategies will play at ${rebufferingAvoidanceMinPlaybackRate}x the speed once ${rebufferingAvoidanceBufferGapSize} second(s) is left in the buffer`}
        </span>
      </li>
    </Fragment>
  );
}

export default React.memo(BufferOptions);
