import React from "react";
import { toMinutes, toHours } from "../lib/time.js";

/**
 * Text with the following structure:
 *   CURRENT_POSITION / DURATION
 * @param {Object} props
 * @returns {Object}
 */
function PositionInfos({
  className = "",
  position = 0,
  duration = 0,
}) {
  const convertTime = duration >= 60*60 ? toHours : toMinutes;
  return (
    <div className={"position-infos " + className}>
      <span className="current-position">
        { convertTime(position) }
      </span>
      <span className="separator">
        {" / "}
      </span>
      <span className="duration">
        { convertTime(duration) }
      </span>
    </div>
  );
}

export default React.memo(PositionInfos);
