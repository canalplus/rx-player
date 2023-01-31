import React, { Fragment } from "react";
import Checkbox from "../CheckBox";
import Select from "../Select";

/**
 * @param {Object} props
 * @returns {Object}
 */
function TrackSwitch({
  onAutoPlayClick,
  autoPlay,
  onManualBrSwitchingModeChange,
  manualBrSwitchingMode,
  stopAtEnd,
  onStopAtEndClick,
}) {
  let manualBitrateSwitchingModeDesc;
  switch (manualBrSwitchingMode) {
    case "direct":
      manualBitrateSwitchingModeDesc =
        "Directly visible transition when a Representation is manually changed";
      break;
    case "seamless":
      manualBitrateSwitchingModeDesc =
        "Smooth transition when a Representation is manually changed";
      break;
    default:
      manualBitrateSwitchingModeDesc =
        "Unknown value";
      break;
  }
  return (
    <Fragment>
      <li>
        <Checkbox
          className="playerOptionsCheckBox playerOptionsCheckBoxTitle"
          name="autoPlay"
          ariaLabel="Auto play option"
          checked={autoPlay}
          onChange={onAutoPlayClick}
        >
          Auto Play
        </Checkbox>
        <span className="option-desc">
          {autoPlay ?
            "Playing directly when the content is loaded." :
            "Staying in pause when the content is loaded."}
        </span>
      </li>
      <li className="featureWrapperWithSelectMode">
        <Select
          className="playerOptionInput"
          name="manualBitrateSwitchingMode"
          onChange={({ value }) => onManualBrSwitchingModeChange(value)}
          selected={{ value: manualBrSwitchingMode }}
          options={["seamless", "direct"]}
        >
          Manual bitrate switching mode
        </Select>
        <span className="option-desc">
          {manualBitrateSwitchingModeDesc}
        </span>
      </li>
      <li>
        <Checkbox
          className="playerOptionsCheckBox playerOptionsCheckBoxTitle"
          name="stopAtEnd"
          ariaLabel="Stop at end option"
          checked={stopAtEnd}
          onChange={onStopAtEndClick}
        >
          Stop At End
        </Checkbox>
        <span className="option-desc">
          {stopAtEnd ?
            "Automatically stop when reaching the end of the content." :
            "Don't stop when reaching the end of the content."}
        </span>
      </li>
    </Fragment>
  );
}

export default React.memo(TrackSwitch);
