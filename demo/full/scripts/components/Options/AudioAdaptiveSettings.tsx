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
    mode: IAudioRepresentationsSwitchingMode
  ) => void;
}) {
  const onSwitchModeChange = React.useCallback(
    ({ value }: { value: string }) => {
      onDefaultAudioRepresentationsSwitchingModeChange(
        value as IAudioRepresentationsSwitchingMode
      );
    },
    [onDefaultAudioRepresentationsSwitchingModeChange]
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
      </li>
    </>
  );
}

export default React.memo(AudioAdaptiveSettings);
