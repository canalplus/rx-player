import * as React from "react";
import { toMinutes, toHours } from "../lib/time";

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
}: {
  className?: string | undefined;
  position?: number | undefined;
  duration?: number | undefined;
}): JSX.Element {
  const convertTime = duration >= 60 * 60 ? toHours : toMinutes;
  return (
    <div className={"position-infos " + className}>
      <span className="current-position">{convertTime(position)}</span>
      <span className="separator">{" / "}</span>
      <span className="duration">{convertTime(duration)}</span>
    </div>
  );
}

export default React.memo(PositionInfos);
