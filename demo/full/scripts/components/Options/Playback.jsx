import React, { Fragment } from "react";
import Checkbox from "../CheckBox";

/**
 * @param {Object} props
 * @returns {Object}
 */
function TrackSwitch({
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
      </li>
    </Fragment>
  );
}

export default React.memo(TrackSwitch);
