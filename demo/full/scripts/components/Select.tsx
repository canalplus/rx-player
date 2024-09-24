import * as React from "react";

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
}: {
  ariaLabel: string;
  children?: string;
  className?: string;
  name: string;
  onChange: (val: { index: number; value: string }) => void;
  selected: { index: number | undefined; value: string | undefined };
  options?: string[] | Array<{ name: string; disabled: boolean }>;
  disabled: boolean;
}): JSX.Element {
  let selectedIndex = typeof selected.index === "number" ? selected.index : undefined;

  const optionsEl = options.map((val, index) => {
    let optName;
    let optDisabled = false;
    if (typeof val === "object") {
      optName = val.name;
      optDisabled = val.disabled;
    } else {
      optName = val;
    }
    if (selectedIndex === undefined && selected.value === optName) {
      selectedIndex = index;
    }
    return (
      <option key={index} value={index} disabled={optDisabled}>
        {optName}
      </option>
    );
  });

  selectedIndex = selectedIndex || 0;

  const onSelectChange = React.useCallback(
    (evt: React.SyntheticEvent<HTMLSelectElement, Event>) => {
      const index = +(evt.target as HTMLSelectElement).value;
      const valueObj = options[index];
      const value = typeof valueObj === "object" ? valueObj.name : valueObj;
      onChange({ index, value });
    },
    [options, onChange],
  );

  const selectEl = disabled ? (
    <select
      aria-label={ariaLabel}
      name={name}
      value={selectedIndex}
      disabled={true}
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
    </select>
  );

  if (children) {
    return (
      <section className={"select " + className}>
        <label htmlFor={name}>{children}</label>
        {selectEl}
      </section>
    );
  }
  return <section className={"select " + className}>{selectEl}</section>;
}

export default React.memo(Select);
