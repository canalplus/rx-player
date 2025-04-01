import * as React from "react";
import getCheckBoxValue from "../lib/getCheckboxValue";

function Checkbox({
  ariaLabel,
  name,
  checked,
  disabled,
  onChange,
  children,
  className,
}: {
  ariaLabel: string;
  className?: string;
  disabled?: boolean;
  onChange: (newVal: boolean) => void;
  name: string;
  checked: boolean;
  children?: string;
}): React.JSX.Element {
  const onInputChange = React.useCallback(
    (evt: React.ChangeEvent<HTMLInputElement>) => {
      onChange(getCheckBoxValue(evt.target));
    },
    [onChange],
  );
  return (
    // TODO is "disabled properly handled here? To check
    <div className={(className ?? "") + (disabled ? " disabled" : "")}>
      <label className="switch">
        <input
          type="checkbox"
          aria-label={ariaLabel}
          name={name}
          id={name}
          checked={checked}
          disabled={disabled}
          onChange={onInputChange}
        />
        <span className="slider round"></span>
      </label>
      <label htmlFor={name}>{children}</label>
    </div>
  );
}

export default Checkbox;
