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
      </li>
    </Fragment>
  );
}

export default React.memo(TrackSwitch);
