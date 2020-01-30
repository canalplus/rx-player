import React from "react";
import withModulesState from "../lib/withModulesState.jsx";

/**
 * Horizontal (left-to-right) volume indication component which:
 *
 *   - represents the current volume relatively to the max and min.
 *
 *   - triggers a setVolume function with the clicked volume percentage on click
 * @param {Object} props
 * @returns {Object}
 */
function VolumeBar({
  player, // current volume percentage
  volume, // callback called with the volume percentage clicked
}) {
  let element;


  const getMouseVolume = (event) => {
    const rect = element.getBoundingClientRect();
    const point0 = rect.left;
    const clickPosPx = Math.max(event.clientX - point0, 0);
    const endPointPx = Math.max(rect.right - point0, 0);
    if (!endPointPx) {
      return 0;
    }
    return Math.min(clickPosPx / endPointPx, 1);
  };

  return (
    <div
      className="volume-bar-wrapper"
      ref={el => element = el }
      onClick={evt =>
        player.dispatch("SET_VOLUME", getMouseVolume(evt))
      }
    >
      <div
        className="volume-bar-current"
        style={{ "width": (volume * 100) + "%" }}
      />
    </div>
  );
}

export default React.memo(withModulesState({
  player: {
    volume: "volume",
  },
})(VolumeBar));
