import React from "react";

/**
 * Simple text input.
 * Call `onChange` when updated.
 * @param {Object} props
 * @returns {Object}
 */
function Input({
  ariaLabel,
  className = "",
  onChange,
  value = "",
  placeholder = "",
}) {
  return (
    <input
      aria-label={ariaLabel}
      className={"input " + className}
      type="text"
      placeholder={placeholder}
      onChange={onChange}
      value={value}
    />
  );
}

export default React.memo(Input);
