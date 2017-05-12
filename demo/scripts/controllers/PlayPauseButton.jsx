const React = require("react");
const Button = require("../components/Button.jsx");
const withModulesState = require("../lib/withModulesState.jsx");

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
const PlayPauseButton = ({
  className = "",
  player,
  isPaused,
  hasLoadedContent,
  hasEnded,
}) => {
  const disabled = !hasLoadedContent || hasEnded;
  const displayPause = !isPaused && hasLoadedContent &&
    !hasEnded;

  const completeClassName = "play-pause-button " +
    className +
    (disabled  ? " disabled" : "");

  const play = () => player.dispatch("PLAY");
  const pause = () => player.dispatch("PAUSE");

  return (
    <Button
      className={completeClassName}
      disabled={disabled}
      onClick={displayPause ? pause : play}
      value={String.fromCharCode(displayPause ? 0xf04c : 0xf04b)}
    />
  );
};

module.exports = withModulesState({
  player: {
    isPaused: "isPaused",
    hasLoadedContent: "hasLoadedContent",
    hasEnded: "hasEnded",
  },
})(PlayPauseButton);
