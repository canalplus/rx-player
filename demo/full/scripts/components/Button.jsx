import React from "react";

/**
 * Generic Button React component.
 * @param {Object} props
 * @returns {Object}
 */
function Button({
  ariaLabel,
  className = "",
  onClick,
  value,
  disabled,
  title,
}) {
  if (disabled) {
    return (
      <button
        aria-label={ariaLabel}
        disabled
        className={className + " disabled"}
        title={title}
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
      title={title}
    >
      {value}
    </button>
  );
}

export default React.memo(Button);
