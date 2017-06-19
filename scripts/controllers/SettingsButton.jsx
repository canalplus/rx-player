import React from "react";
import Button from "../components/Button.jsx";

/**
 * Simple settings button, with a callback (onClick) on click.
 * @param {Object} props
 * @returns {Object}
 */
export default ({ className = "", onClick, disabled }) => (
  <Button
    className={"settings-button " + className}
    onClick={onClick}
    disabled={disabled}
    value={String.fromCharCode(0xf013)}
  />
);
