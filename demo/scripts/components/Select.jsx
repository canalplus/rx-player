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
  selected,
  options = [],
  disabled,
}) => {
  const optionsEl = options.map((val, index) =>
    <option
      key={index}
      value={index}
      selected={selected === index ? "selected" : ""}
    >
      {val}
    </option>
  );

  const selectEl = disabled ? (
    <select disabled="disabled" onChange={onChange}>
      {optionsEl}
    </select>
  ) : (
    <select onChange={onChange}>
      {optionsEl}
    </select>
  );

  return (
      <section className={"select " + className}>
        {selectEl}
      </section>
  );
};
