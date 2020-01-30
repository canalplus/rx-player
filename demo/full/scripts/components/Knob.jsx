import React from "react";
import Select from "./Select.jsx";

function Knob({
  ariaLabel,
  className = "",
  name = "",
  onChange,
  options = [],
  selected,
  disabled,
}) {
  return (
    <div className={`knob ${className}`}>
      <span className="knob-name" >
        {name}
      </span>
      <Select
        ariaLabel={ariaLabel}
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
