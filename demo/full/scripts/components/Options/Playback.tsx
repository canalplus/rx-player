import * as React from "react";
import Checkbox from "../CheckBox";

/**
 * @param {Object} props
 * @returns {Object}
 */
function PlaybackConfig({
  autoPlay,
  onAutoPlayChange,
}: {
  autoPlay: boolean;
  onAutoPlayChange: (val: boolean) => void;
}): JSX.Element {
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
          {autoPlay ?
            "Playing directly when the content is loaded." :
            "Staying in pause when the content is loaded."}
        </span>
      </li>
    </>
  );
}

export default React.memo(PlaybackConfig);
