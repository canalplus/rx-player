const React = require("react");
const { toMinutes, toHours } = require("../lib/time.js");

/**
 * Text with the following structure:
 *   CURRENT_POSITION / DURATION
 * @param {Object} props
 * @returns {Object}
 */
module.exports = ({
  className = "",
  position = 0,
  duration = 0,
}) => {
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
};
