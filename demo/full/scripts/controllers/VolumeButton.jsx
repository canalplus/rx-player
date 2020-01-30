import React from "react";
import Button from "../components/Button.jsx";
import withModulesState from "../lib/withModulesState.jsx";

/**
 * Simple volume button.
 * Triggers the right callback on click.
 *
 * Needs 2 props:
 *   - {Object} player: the player module.
 *   - {string} [className]: An optional className to add to the
 *     button
 *
 * @param {Object} props
 * @returns {Object}
 */
function VolumeButton({
  className = "",
  player,
  volume,
}) {
  let volumeLevelClass;
  let charCode;
  if (volume === 0) {
    volumeLevelClass = "muted";
    charCode = 0xf026;
  } else if (volume <= 0.5) {
    volumeLevelClass = "low";
    charCode = 0xf027;
  } else {
    volumeLevelClass = "high";
    charCode = 0xf028;
  }
  return (
    <Button
      ariaLabel="Mute/Unmute audio"
      className={
        `volume-button ${className} ${volumeLevelClass}`
      }
      onClick={volume === 0 ?
        () => player.dispatch("UNMUTE") :
        () => player.dispatch("MUTE")
      }
      value={String.fromCharCode(charCode)}
    />
  );
}

export default React.memo(withModulesState({
  player: {
    volume: "volume",
  },
})(VolumeButton));
