const React = require("react");
const Select = require("./Select.jsx");

module.exports = ({
  className = "",
  name = "",
  onChange,
  options = [],
  selected,
  disabled,
}) => (
  <div className={`knob ${className}`}>
    <span className="knob-name" >
      {name}
    </span>
    <Select
      className="knob-value"
      onChange={onChange}
      options={options}
      selected={selected}
      disabled={disabled}
    />
  </div>
);
