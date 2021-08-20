import React from "react";

function Checkbox({ ariaLabel, name, checked, onChange, children, className }) {
  return (
    <div className={className}>
      <label className="input switch">
        <input
          type="checkbox"
          aria-label={ariaLabel}
          name={name}
          id={name}
          checked={checked}
          onChange={onChange}
        />
        <span className="slider round"></span>
      </label>
      <label htmlFor={name}>{children}</label>
    </div>
  );
}

export default Checkbox;
