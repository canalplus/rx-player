import React from "react";

/**
 * Simple text input which is focused when mounted.
 * Call `onChange` when updated.
 */
export default class FocusedInput extends React.Component {
  componentDidMount(){
    if (this._input != null) {
      this._input.focus();
    }
  }

  render() {
    const { className = "",
            onChange,
            value = "",
            placeholder = "" } = this.props;

    const saveRef = ref => {
      this._input = ref;
    };
    return (
      <input
        ref={saveRef}
        className={"input " + className}
        type="text"
        placeholder={placeholder}
        onChange={onChange}
        value={value}
      />
    );
  }
}
