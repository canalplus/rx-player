import React from "react";

/**
 * Generic Button React component.
 * @param {Object} props
 * @returns {Object}
 */
export default ({
  ariaLabel,
  className = "",
  onClick,
  value,
  disabled,
}) => {
  if (disabled) {
    return (
      <button
        aria-label={ariaLabel}
        disabled
        className={className + " disabled"}
      >
        {value}
      </button>
    );
  }

  return (
    <button
      aria-label={ariaLabel}
      className={className}
      onClick={onClick}
    >
      {value}
    </button>
  );
};
