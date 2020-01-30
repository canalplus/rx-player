import React from "react";

/**
 * Simple select list. Call the onChange call back on choice with the index of
 * the option chosen in argument.
 * @param {Object} props
 * @returns {Object}
 */
function Select({
  ariaLabel,
  className = "",
  onChange,
  selected,
  options = [],
  disabled,
}) {
  const optionsEl = options.map((val, index) =>
    typeof val === "object" ?
      <option
        key={index}
        value={index}
        disabled={val.disabled}
      >
        {val.name}
      </option> :
      <option
        key={index}
        value={index}
      >
        {val}
      </option>);

  const selectEl = disabled ? (
    <select
      aria-label={ariaLabel}
      value={selected}
      disabled="disabled"
      onChange={onChange}
    >
      {optionsEl}
    </select>
  ) : (
    <select
      aria-label={ariaLabel}
      value={selected}
      onChange={onChange}
    >
      {optionsEl}
    </select>);

  return (
    <section className={"select " + className}>
      {selectEl}
    </section>);
}

export default React.memo(Select);
