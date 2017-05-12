const React = require("react");
const Button = require("../components/Button.jsx");
const withModulesState = require("../lib/withModulesState.jsx");

/**
 * Simple fullscreen button.
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
const FullscreenButton = ({
  className = "",
  player,
  isFullscreen,
  hasLoadedContent,
  hasEnded,
}) => (
  <Button
    className={"fullscreen-button " + className}
    onClick={isFullscreen ?
        () => player.dispatch("EXIT_FULL_SCREEN") :
        () => player.dispatch("SET_FULL_SCREEN")
    }
    disabled={!hasLoadedContent || hasEnded}
    value={String.fromCharCode(isFullscreen ? 0xf066 : 0xf065)}
  />
);

module.exports = withModulesState({
  player: {
    isFullscreen: "isFullscreen",
    hasLoadedContent: "hasLoadedContent",
    hasEnded: "hasEnded",
  },
})(FullscreenButton);
