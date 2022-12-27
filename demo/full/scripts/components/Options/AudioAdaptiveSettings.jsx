import React, { Fragment } from "react";
import Select from "../Select";

/**
 * @param {Object} props
 * @returns {Object}
 */
function AudioAdaptiveSettings({
  defaultAudioRepresentationsSwitchingMode,
  onDefaultAudioRepresentationsSwitchingModeChange,
}) {
  let defaultAudioRepresentationsSwitchingModeDescMsg;
  switch (defaultAudioRepresentationsSwitchingMode) {
    case "reload":
      defaultAudioRepresentationsSwitchingModeDescMsg =
        "Reloading by default when audio Representations are manually changed";
      break;
    case "lazy":
      defaultAudioRepresentationsSwitchingModeDescMsg =
        "Keeping previous data when audio Representations are manually changed";
      break;
    case "direct":
      defaultAudioRepresentationsSwitchingModeDescMsg =
        "Directly visible transition when audio Representations are manually changed";
      break;
    case "seamless":
      defaultAudioRepresentationsSwitchingModeDescMsg =
        "Smooth transition when audio Representations are manually changed";
      break;
    default:
      defaultAudioRepresentationsSwitchingModeDescMsg =
        "Unknown value";
      break;
  }

  return (
    <Fragment>
      <li className="featureWrapperWithSelectMode">
        <Select
          className="playerOptionInput"
          name="defaultAudioRepresentationsSwitchingMode"
          onChange={({ value }) =>
            onDefaultAudioRepresentationsSwitchingModeChange(value)}
          selected={{ value: defaultAudioRepresentationsSwitchingMode }}
          options={["seamless", "lazy", "direct", "reload"]}
        >
            Default Audio Representations switching mode
        </Select>
        <span className="option-desc">
          {defaultAudioRepresentationsSwitchingModeDescMsg}
        </span>
      </li>
    </Fragment>
  );
}

export default React.memo(AudioAdaptiveSettings);
