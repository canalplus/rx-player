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
      </li>
    </Fragment>
  );
}

export default React.memo(AudioAdaptiveSettings);
