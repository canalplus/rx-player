import React from "react";
import Button from "../components/Button.jsx";
import withModulesState from "../lib/withModulesState.jsx";

/**
 * Play/Pause button.
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
function PlayPauseButton({
  cannotLoadMetadata,
  className = "",
  player,
  isPaused,
  isContentLoaded,
  hasEnded,
}) {
  const disabled = !isContentLoaded && !cannotLoadMetadata;
  const displayPause = !isPaused && isContentLoaded &&
    !hasEnded;

  const completeClassName = "play-pause-button " +
    className +
    (disabled  ? " disabled" : "");

  const play = () => player.dispatch("PLAY");
  const pause = () => {
    player.dispatch("DISABLE_LIVE_CATCH_UP");
    player.dispatch("PAUSE");
  };

  return (
    <Button
      ariaLabel="Pause/Resume the content"
      className={completeClassName}
      disabled={disabled}
      onClick={displayPause ? pause : play}
      value={String.fromCharCode(displayPause ? 0xf04c : 0xf04b)}
    />
  );
}

export default React.memo(withModulesState({
  player: {
    cannotLoadMetadata: "cannotLoadMetadata",
    isPaused: "isPaused",
    isContentLoaded: "isContentLoaded",
    hasEnded: "hasEnded",
  },
})(PlayPauseButton));
