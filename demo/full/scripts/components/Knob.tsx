import * as React from "react";
import Select from "./Select";

function Knob({
  ariaLabel,
  className = "",
  name = "",
  onChange,
  options = [],
  selected,
  disabled,
}: {
  ariaLabel: string;
  className?: string | undefined;
  name?: string;
  onChange: (val: { index: number; value: string }) => void;
  options: string[];
  selected: { index: number | undefined; value: string | undefined };
  disabled: boolean;
}): JSX.Element {
  return (
    <div className={`knob ${className}`}>
      <span className="knob-name">{name}</span>
      <Select
        ariaLabel={ariaLabel}
        name={name}
        className="knob-value"
        onChange={onChange}
        options={options}
        selected={selected}
        disabled={disabled}
      />
    </div>
  );
}

export default React.memo(Knob);
