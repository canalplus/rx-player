import React from "react";

/**
 * Simple select list. Call the onChange call back on choice with the index of
 * the option chosen in argument.
 * @param {Object} props
 * @returns {Object}
 */
export default ({
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
    >
      {val}
    </option>
  );

  const selectEl = disabled ? (
    <select value={selected != null ? selected : 0} disabled="disabled" onChange={onChange}>
      {optionsEl}
    </select>
  ) : (
    <select value={selected != null ? selected : 0} onChange={onChange}>
      {optionsEl}
    </select>
  );

  return (
    <section className={"select " + className}>
      {selectEl}
    </section>
  );
};
