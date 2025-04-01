import * as React from "react";
import Checkbox from "../CheckBox";
import Select from "../Select";

/**
 * @param {Object} props
 * @returns {Object}
 */
function TrackSwitchConfig({
  enableFastSwitching,
  defaultAudioTrackSwitchingMode,
  onCodecSwitch,
  onDefaultAudioTrackSwitchingModeChange,
  onCodecSwitchChange,
  onEnableFastSwitchingChange,
}: {
  defaultAudioTrackSwitchingMode: string;
  onDefaultAudioTrackSwitchingModeChange: (newVal: string) => void;
  enableFastSwitching: boolean;
  onCodecSwitch: string;
  onCodecSwitchChange: (val: string) => void;
  onEnableFastSwitchingChange: (val: boolean) => void;
}): React.JSX.Element {
  let defaultAudioTrackSwitchingModeDescMsg;
  switch (defaultAudioTrackSwitchingMode) {
    case "reload":
      defaultAudioTrackSwitchingModeDescMsg =
        "Reloading by default when the audio track is changed";
      break;
    case "direct":
      defaultAudioTrackSwitchingModeDescMsg =
        "Directly audible transition when the audio track is changed";
      break;
    case "seamless":
      defaultAudioTrackSwitchingModeDescMsg =
        "Smooth transition when the audio track is changed";
      break;
    default:
      defaultAudioTrackSwitchingModeDescMsg = "Unknown value";
      break;
  }

  let onCodecSwitchDescMsg;
  switch (onCodecSwitch) {
    case "reload":
      onCodecSwitchDescMsg = "Reloading buffers when the codec changes";
      break;
    case "continue":
      onCodecSwitchDescMsg = "Keeping the same buffers even when the codec changes";
      break;
    default:
      onCodecSwitchDescMsg = "Unknown value";
      break;
  }

  const onCodecSwitchSelection = React.useCallback(
    ({ value }: { value: string }) => onCodecSwitchChange(value),
    [onCodecSwitchChange],
  );

  const onDefaultAudioTrackSwitchingModeSelection = React.useCallback(
    ({ value }: { value: string }) => onDefaultAudioTrackSwitchingModeChange(value),
    [onDefaultAudioTrackSwitchingModeChange],
  );

  return (
    <>
      <li>
        <Checkbox
          className="playerOptionsCheckBox playerOptionsCheckBoxTitle"
          ariaLabel="Fast switching option"
          name="fastSwitching"
          checked={enableFastSwitching}
          onChange={onEnableFastSwitchingChange}
        >
          Fast Switching
        </Checkbox>
        <span className="option-desc">
          {enableFastSwitching
            ? "Fast quality switch by replacing lower qualities in the buffer by higher ones when possible."
            : "Not replacing lower qualities in the buffer by an higher one when possible."}
        </span>
      </li>
      <li className="featureWrapperWithSelectMode">
        <Select
          ariaLabel="Selecting the defaultAudioTrackSwitchingMode attribute"
          disabled={false}
          className="playerOptionInput"
          name="defaultAudioTrackSwitchingMode"
          onChange={onDefaultAudioTrackSwitchingModeSelection}
          selected={{ value: defaultAudioTrackSwitchingMode, index: undefined }}
          options={["seamless", "direct", "reload"]}
        >
          Audio track switching mode
        </Select>
        <span className="option-desc">{defaultAudioTrackSwitchingModeDescMsg}</span>
      </li>
      <li className="featureWrapperWithSelectMode">
        <Select
          ariaLabel="Selecting the onCodecSwitch attribute"
          disabled={false}
          className="playerOptionInput"
          name="onCodecSwitch"
          onChange={onCodecSwitchSelection}
          selected={{ value: onCodecSwitch, index: undefined }}
          options={["continue", "reload"]}
        >
          On Codec Switch
        </Select>
        <span className="option-desc">{onCodecSwitchDescMsg}</span>
      </li>
    </>
  );
}

export default React.memo(TrackSwitchConfig);
