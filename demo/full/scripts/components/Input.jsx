import React from "react";

/**
 * Simple text input.
 * Call `onChange` when updated.
 * @param {Object} props
 * @returns {Object}
 */
export default ({
  className = "",
  onChange,
  value = "",
  placeholder = "",
}) => {
  return (
    <input
      className={"input " + className}
      type="text"
      placeholder={placeholder}
      onChange={onChange}
      value={value}
    />
  );
};

