import * as React from "react";
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
  onStopAtEndChange,
  stopAtEnd,
}: {
  autoPlay: boolean;
  manualBitrateSwitchingMode: string;
  onAutoPlayChange: (val: boolean) => void;
  onManualBitrateSwitchingModeChange: (val: string) => void;
  onStopAtEndChange: (val: boolean) => void;
  stopAtEnd: boolean;
}): JSX.Element {
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
      manualBitrateSwitchingModeDesc = "Unknown value";
      break;
  }

  const onManualBitrateSwitchingModeSelection = React.useCallback(
    ({ value }: { value: string }) => onManualBitrateSwitchingModeChange(value),
    [onManualBitrateSwitchingModeChange],
  );

  return (
    <>
      <li>
        <Checkbox
          className="playerOptionsCheckBox playerOptionsCheckBoxTitle"
          name="autoPlay"
          ariaLabel="Auto play option"
          checked={autoPlay}
          onChange={onAutoPlayChange}
        >
          Auto Play
        </Checkbox>
        <span className="option-desc">
          {autoPlay
            ? "Playing directly when the content is loaded."
            : "Staying in pause when the content is loaded."}
        </span>
      </li>
      <li className="featureWrapperWithSelectMode">
        <Select
          ariaLabel="Manual Bitrate Switching Mode selection"
          disabled={false}
          className="playerOptionInput"
          name="manualBitrateSwitchingMode"
          onChange={onManualBitrateSwitchingModeSelection}
          selected={{ index: undefined, value: manualBitrateSwitchingMode }}
          options={["seamless", "direct"]}
        >
          {"Manual bitrate switching mode"}
        </Select>
        <span className="option-desc">{manualBitrateSwitchingModeDesc}</span>
      </li>
      <li>
        <Checkbox
          className="playerOptionsCheckBox playerOptionsCheckBoxTitle"
          name="stopAtEnd"
          ariaLabel="Stop at end option"
          checked={stopAtEnd}
          onChange={onStopAtEndChange}
        >
          Stop At End
        </Checkbox>
        <span className="option-desc">
          {stopAtEnd
            ? "Automatically stop when reaching the end of the content."
            : "Don't stop when reaching the end of the content."}
        </span>
      </li>
    </>
  );
}

export default React.memo(TrackSwitch);
