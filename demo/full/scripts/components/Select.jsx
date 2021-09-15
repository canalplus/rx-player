import React from "react";

/**
 * Simple select list. Call the onChange call back on choice with the index of
 * the option chosen in argument.
 * @param {Object} props
 * @returns {Object}
 */
function Select({
  ariaLabel,
  children,
  className = "",
  name,
  onChange,
  selected,
  options = [],
  disabled,
}) {
  function onSelectChange(evt) {
    const index = +evt.target.value;
    const valueObj = options[index];
    const value = typeof valueObj === "object" ?
      valueObj.name :
      valueObj;
    onChange({ index, value });
  }

  let selectedIndex = typeof selected.index === "number" ?
    selected.index :
    undefined;

  const optionsEl = options.map((val, index) => {
    let name;
    let disabled = false;
    if (typeof val === "object") {
      name = val.name;
      disabled = val.disabled;
    } else {
      name = val;
    }
    if (selectedIndex === undefined && selected.value === name) {
      selectedIndex = index;
    }
    return <option key={index} value={index} disabled={disabled}>
      {name}
    </option>;
  });

  selectedIndex = selectedIndex || 0;

  const selectEl = disabled ? (
    <select
      aria-label={ariaLabel}
      name={name}
      value={selectedIndex}
      disabled="disabled"
      onChange={onSelectChange}
    >
      {optionsEl}
    </select>
  ) : (
    <select
      name={name}
      aria-label={ariaLabel}
      value={selectedIndex}
      onChange={onSelectChange}
    >
      {optionsEl}
    </select>);

  if (children) {
    return (
      <section className={"select " + className}>
        <label htmlFor={name}>{children}</label>
        {selectEl}
      </section>);
  }
  return (
    <section className={"select " + className}>
      {selectEl}
    </section>);
}

export default React.memo(Select);
