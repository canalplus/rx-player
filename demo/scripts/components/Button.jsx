const React = require("react");

/**
 * Generic Button React component.
 * @param {Object} props
 * @returns {Object}
 */
module.exports = ({
  className = "",
  onClick,
  value,
  disabled,
}) => {
  if (disabled) {
    return (
      <button
        disabled
        className={className + " disabled"}
      >
        {value}
      </button>
    );
  }

  return (
    <button
      className={className}
      onClick={onClick}
    >
      {value}
    </button>
  );
};
