import * as React from "react";
import Checkbox from "../CheckBox";
import Select from "../Select";

/**
 * @param {Object} props
 * @returns {Object}
 */
function NetworkConfig({
  audioTrackSwitchingMode,
  enableFastSwitching,
  onAudioTrackSwitchingModeChange,
  onCodecSwitch,
  onCodecSwitchChange,
  onEnableFastSwitchingChange,
}: {
  audioTrackSwitchingMode: string;
  enableFastSwitching: boolean;
  onAudioTrackSwitchingModeChange: (val: string) => void;
  onCodecSwitch: string;
  onCodecSwitchChange: (val: string) => void;
  onEnableFastSwitchingChange: (val: boolean) => void;
}): JSX.Element {
  let audioTrackSwitchingModeDescMsg;
  switch (audioTrackSwitchingMode) {
    case "reload":
      audioTrackSwitchingModeDescMsg = "Reloading when the audio track is changed";
      break;
    case "direct":
      audioTrackSwitchingModeDescMsg =
        "Directly audible transition when the audio track is changed";
      break;
    case "seamless":
      audioTrackSwitchingModeDescMsg =
        "Smooth transition when the audio track is changed";
      break;
    default:
      audioTrackSwitchingModeDescMsg = "Unknown value";
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

  const onAudioTrackSwitchingModeSelection = React.useCallback(
    ({ value }: { value: string }) => onAudioTrackSwitchingModeChange(value),
    [onAudioTrackSwitchingModeChange],
  );

  const onCodecSwitchSelection = React.useCallback(
    ({ value }: { value: string }) => onCodecSwitchChange(value),
    [onCodecSwitchChange],
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
          ariaLabel="Selecting the Audio Track Switching Mode"
          disabled={false}
          className="playerOptionInput"
          name="audioTrackSwitchingMode"
          onChange={onAudioTrackSwitchingModeSelection}
          selected={{ value: audioTrackSwitchingMode, index: undefined }}
          options={["seamless", "direct", "reload"]}
        >
          Audio track switching mode
        </Select>
        <span className="option-desc">{audioTrackSwitchingModeDescMsg}</span>
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

export default React.memo(NetworkConfig);
