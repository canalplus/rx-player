import React from "react";

/**
 * For now, only written "Live" (we will see for timeshifting and such)
 * @param {Object} props
 * @returns {Object}
 */
export default ({
  className = "",
  currentReadableHour
}) => {
  return (
    <div className={"position-infos live " + className}>
      {currentReadableHour}
    </div>
  );
};
