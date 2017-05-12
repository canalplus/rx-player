const React = require("react");

/**
 * For now, only written "Live" (we will see for timeshifting and such)
 * @param {Object} props
 * @returns {Object}
 */
module.exports = ({
  className = "",
}) => {
  return (
    <div className={"position-infos live " + className}>
      Live
    </div>
  );
};
