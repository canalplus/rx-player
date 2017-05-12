const React = require("react");
const Button = require("../components/Button.jsx");


const debugMenu = () => {
  return (
    <div
      className="settings-menu player-menu"
    >
      <div
        className="settings-menu-entry player-menu-entry"
      >
        Audio Bitrate
      </div>
      <div
        className="settings-menu-entry player-menu-entry"
      >
        Video Bitrate
      </div>
      <div
        className="settings-menu-entry player-menu-entry"
      >
        Audio Buffer Size
      </div>
      <div
        className="settings-menu-entry player-menu-entry"
      >
        Video Buffer Size
      </div>
      <div
        className="settings-menu-entry player-menu-entry"
      >
        Toggle Debug Panel
      </div>
    </div>
  );
};
/**
 * Simple settings button, with a callback (onClick) on click.
 * @param {Object} props
 * @returns {Object}
 */
module.exports = ({ className = "", onClick, disabled }) => (
  <Button
    className={"settings-button " + className}
    onClick={onClick}
    disabled={disabled}
    value={String.fromCharCode(0xf013)}
  />
);
