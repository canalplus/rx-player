import React, { Fragment } from "react";
import getCheckBoxValue from "../../lib/getCheckboxValue";
import Checkbox from "../CheckBox";
import Select from "../Select";

/**
 * @param {Object} props
 * @returns {Object}
 */
function TrackSwitch({
  autoPlay,
  manualBitrateSwitchingMode,
  onAutoPlayChange,
  onManualBitrateSwitchingModeChange,
}) {
  let manualBitrateSwitchingModeDesc;
  switch (manualBitrateSwitchingMode) {
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
          onChange={(evt) => {
            onAutoPlayChange(getCheckBoxValue(evt.target));
          }}
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
          onChange={({ value }) => onManualBitrateSwitchingModeChange(value)}
          selected={{ value: manualBitrateSwitchingMode }}
          options={["seamless", "direct"]}
        >
          Manual bitrate switching mode
        </Select>
        <span className="option-desc">
          {manualBitrateSwitchingModeDesc}
        </span>
      </li>
    </Fragment>
  );
}

export default React.memo(TrackSwitch);
