import * as React from "react";

const { useEffect, useRef } = React;

/**
 * Simple text input which is focused when mounted.
 * Call `onChange` when updated.
 * @param {Object} props
 * @returns {Object}
 */
function FocusedInput({
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
}): React.JSX.Element {
  const inputEl = useRef<HTMLInputElement>(null);
  useEffect(
    () => {
      if (inputEl.current != null) {
        inputEl.current.focus();
      }
    },
    [] /* trigger only when mounted */,
  );
  const onInputChange = React.useCallback(
    (evt: React.ChangeEvent<HTMLInputElement>) => {
      onChange(evt.target.value);
    },
    [onChange],
  );
  return (
    <input
      ref={inputEl}
      className={"input " + className}
      aria-label={ariaLabel}
      type="text"
      placeholder={placeholder}
      onChange={onInputChange}
      value={value}
    />
  );
}

export default React.memo(FocusedInput);
