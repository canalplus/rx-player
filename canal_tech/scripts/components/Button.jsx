import React from "react";

/**
 * Generic Button React component.
 * @param {Object} props
 * @returns {Object}
 */
export default ({
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
