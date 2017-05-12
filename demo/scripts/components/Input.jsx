const React = require("react");

/**
 * Simple select list. Call the onChange call back on choice with the index of
 * the option chosen in argument.
 * @param {Object} props
 * @returns {Object}
 */
module.exports = ({
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

