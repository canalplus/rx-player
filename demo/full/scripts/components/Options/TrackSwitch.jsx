import React, { Fragment } from "react";
import Checkbox from "../CheckBox";
import Select from "../Select";

/**
 * @param {Object} props
 * @returns {Object}
 */
function TrackSwitchConfig({
  enableFastSwitching,
  onCodecSwitch,
  onEnableFastSwitchingClick,
  onCodecSwitchChange,
}) {
  let onCodecSwitchDescMsg;
  switch (onCodecSwitch) {
    case "reload":
      onCodecSwitchDescMsg = "Reloading buffers when the codec changes";
      break;
    case "continue":
      onCodecSwitchDescMsg =
        "Keeping the same buffers even when the codec changes";
      break;
    default:
      onCodecSwitchDescMsg =
        "Unknown value";
      break;
  }

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
        <span className="option-desc">
          {enableFastSwitching ?
            "Fast quality switch by replacing lower qualities in the buffer by higher ones when possible." :
            "Not replacing lower qualities in the buffer by an higher one when possible."}
        </span>
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
        <span className="option-desc">
          {onCodecSwitchDescMsg}
        </span>
      </li>
    </Fragment>
  );
}

export default React.memo(TrackSwitchConfig);
