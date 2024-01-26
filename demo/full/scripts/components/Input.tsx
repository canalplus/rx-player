import * as React from "react";

/**
 * Simple text input.
 * Call `onChange` when updated.
 * @param {Object} props
 * @returns {Object}
 */
function Input({
  ariaLabel,
  className = "",
  onChange,
  value = "",
  placeholder = "",
}: {
  ariaLabel: string;
  className?: string;
  onChange: (newVal: string) => void;
  value?: string;
  placeholder?: string;
}): JSX.Element {
  const onInputChange = React.useCallback(
    (evt: React.ChangeEvent<HTMLInputElement>) => {
      onChange(evt.target.value);
    },
    [onChange],
  );
  return (
    <input
      aria-label={ariaLabel}
      className={"input " + className}
      type="text"
      placeholder={placeholder}
      onChange={onInputChange}
      value={value}
    />
  );
}

export default React.memo(Input);
