import React, {
  useEffect,
  useRef,
} from "react";

/**
 * Simple text input which is focused when mounted.
 * Call `onChange` when updated.
 */
function FocusedInput({
  ariaLabel,
  className = "",
  onChange,
  value = "",
  placeholder = "",
}) {
  const inputEl = useRef(null);
  useEffect(() => {
    if (inputEl.current != null) {
      inputEl.current.focus();
    }
  }, [] /* trigger only when mounted */);
  return (
    <input
      ref={inputEl}
      className={"input " + className}
      aria-label={ariaLabel}
      type="text"
      placeholder={placeholder}
      onChange={onChange}
      value={value}
    />
  );
}

export default React.memo(FocusedInput);
