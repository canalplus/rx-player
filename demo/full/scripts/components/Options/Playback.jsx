import React, { Fragment } from "react";
import getCheckBoxValue from "../../lib/getCheckboxValue";
import Checkbox from "../CheckBox";

/**
 * @param {Object} props
 * @returns {Object}
 */
function PlaybackConfig({
  autoPlay,
  onAutoPlayChange,
}) {
  return (
    <Fragment>
      <li>
        <Checkbox
          className="playerOptionsCheckBox playerOptionsCheckBoxTitle"
          name="autoPlay"
          ariaLabel="Auto play option"
          checked={autoPlay}
          onChange={(evt) => {
            onAutoPlayChange(getCheckBoxValue(evt.target));
          }}
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
