import React, { Fragment } from "react";
import Checkbox from "../CheckBox";

/**
 * @param {Object} props
 * @returns {Object}
 */
function PlaybackConfig({
  onAutoPlayClick,
  autoPlay,
}) {
  return (
    <Fragment>
      <li>
        <Checkbox
          className="playerOptionsCheckBox playerOptionsCheckBoxTitle"
          name="autoPlay"
          ariaLabel="Auto play option"
          checked={autoPlay}
          onChange={onAutoPlayClick}
        >
          Auto Play
        </Checkbox>
        <span className="option-desc">
          {autoPlay ?
            "Playing directly when the content is loaded." :
            "Staying in pause when the content is loaded."}
        </span>
      </li>
    </Fragment>
  );
}

export default React.memo(PlaybackConfig);
