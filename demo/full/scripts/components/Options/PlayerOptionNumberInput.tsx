import * as React from "react";
import Button from "../Button";

/**
 * Creates an input text box for a number-formatted player option.
 *
 * These are still text boxes (and not of type number), to allow typing special
 * float values such as `Infinity`.
 */
function PlayerOptionNumberInput({
  ariaLabel,
  label,
  title,
  onUpdateValue,
  valueAsString,
  defaultValueAsNumber,
  isDisabled,
  onResetClick,
}: {
  ariaLabel: string;
  label: string;
  title: string;
  onUpdateValue: (val: string) => void;
  valueAsString: string;
  defaultValueAsNumber: number;
  isDisabled: boolean;
  onResetClick: () => void;
}): JSX.Element {
  const shouldBeDisabled = parseFloat(valueAsString) === defaultValueAsNumber;
  const onInputChange = React.useCallback(
    (evt: React.ChangeEvent<HTMLInputElement>) => {
      onUpdateValue(evt.target.value);
    },
    [onUpdateValue],
  );
  return (
    <div className="playerOptionInput">
      <label htmlFor={label}>{title}</label>
      <span className="wrapperInputWithResetBtn">
        <input
          type="text"
          name={label}
          aria-label={ariaLabel}
          placeholder="Number"
          onChange={onInputChange}
          value={valueAsString}
          disabled={isDisabled}
          className="optionInput"
        />
        <Button
          disabled={shouldBeDisabled}
          className={shouldBeDisabled ? "resetBtn disabledResetBtn" : "resetBtn"}
          ariaLabel="Reset option to default value"
          title="Reset option to default value"
          onClick={onResetClick}
          value={String.fromCharCode(0xf021)}
        />
      </span>
    </div>
  );
}

export default PlayerOptionNumberInput;
