import React, { Fragment } from "react";
import Checkbox from "../CheckBox";
import Select from "../Select";

/**
 * @param {Object} props
 * @returns {Object}
 */
function NetworkConfig({
  enableFastSwitching,
  defaultAudioTrackSwitchingMode,
  onCodecSwitch,
  onEnableFastSwitchingClick,
  onDefaultAudioTrackSwitchingModeChange,
  onCodecSwitchChange,
}) {
  return (
    <Fragment>
      <li>
        <Checkbox
          className="playerOptionsCheckBox playerOptionsCheckBoxTitle"
          ariaLabel="Fast switching option"
          name="fastSwitching"
          id="fastSwitching"
          checked={enableFastSwitching}
          onChange={onEnableFastSwitchingClick}
        >
          Fast Switching
        </Checkbox>
      </li>
      <li className="featureWrapperWithSelectMode">
        <Select
          className="playerOptionInput"
          name="defaultAudioTrackSwitchingMode"
          onChange={({ value }) =>
            onDefaultAudioTrackSwitchingModeChange(value)}
          selected={{ value: defaultAudioTrackSwitchingMode }}
          options={["seamless", "direct", "reload"]}
        >
            Audio track switching mode
        </Select>
      </li>
      <li className="featureWrapperWithSelectMode">
        <Select
          className="playerOptionInput"
          name="onCodecSwitch"
          onChange={({ value }) => onCodecSwitchChange(value)}
          selected={{ value: onCodecSwitch }}
          options={["continue", "reload"]}
        >
          On Codec Switch
        </Select>
      </li>
    </Fragment>
  );
}

export default React.memo(NetworkConfig);
