import * as React from "react";
import { IAudioRepresentationsSwitchingMode } from "../../../../../src/public_types";
import Select from "../Select";

/**
 * @param {Object} props
 * @returns {Object}
 */
function AudioAdaptiveSettings({
  defaultAudioRepresentationsSwitchingMode,
  onDefaultAudioRepresentationsSwitchingModeChange,
}: {
  defaultAudioRepresentationsSwitchingMode: IAudioRepresentationsSwitchingMode;
  onDefaultAudioRepresentationsSwitchingModeChange: (
    mode: IAudioRepresentationsSwitchingMode,
  ) => void;
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
      defaultAudioRepresentationsSwitchingModeDescMsg = "Unknown value";
      break;
  }

  const onSwitchModeChange = React.useCallback(
    ({ value }: { value: string }) => {
      onDefaultAudioRepresentationsSwitchingModeChange(
        value as IAudioRepresentationsSwitchingMode,
      );
    },
    [onDefaultAudioRepresentationsSwitchingModeChange],
  );
  return (
    <>
      <li className="featureWrapperWithSelectMode">
        <Select
          ariaLabel="Select the defaultAudioRepresentationsSwitchingMode"
          className="playerOptionInput"
          disabled={false}
          name="defaultAudioRepresentationsSwitchingMode"
          onChange={onSwitchModeChange}
          selected={{
            value: defaultAudioRepresentationsSwitchingMode,
            index: undefined,
          }}
          options={["seamless", "lazy", "direct", "reload"]}
        >
          Default Audio Representations switching mode
        </Select>
        <span className="option-desc">
          {defaultAudioRepresentationsSwitchingModeDescMsg}
        </span>
      </li>
    </>
  );
}

export default React.memo(AudioAdaptiveSettings);
