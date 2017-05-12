const React = require("react");
const withModulesState = require("../lib/withModulesState.jsx");
const PositionInfos = require("../components/PositionInfos.jsx");
const LivePosition = require("../components/LivePosition.jsx");
// const SettingsButton = require("./SettingsButton.jsx");
const PlayPauseButton = require("./PlayPauseButton.jsx");
const FullscreenButton = require("./FullScreenButton.jsx");
const Progressbar = require("./ProgressBar.jsx");
const VolumeButton = require("./VolumeButton.jsx");
const VolumeBar = require("./VolumeBar.jsx");

const ControlBar = ({
  currentTime,
  duration,
  hasLoadedContent,
  hasEnded,
  isLive,
  player,
}) => {
  const displayControls = hasLoadedContent && !hasEnded;

  let positionElement;
  if (!displayControls) {
    positionElement = null;
  } else if (isLive) {
    positionElement = <LivePosition />;
  } else {
    positionElement = <PositionInfos
      position={currentTime}
      duration={duration}
    />;
  }

  return (
    <div className="controls-bar-container">
      { (!displayControls || isLive) ?
          null : <Progressbar player={player} />
      }
      <div className="controls-bar">
        <PlayPauseButton
          className={"control-button"}
          player={player}
        />
        { positionElement }
        <div className="controls-right-side">
          <div className="volume">
            <VolumeButton
              className="control-button"
              player={player}
            />
            <VolumeBar
              className="control-button"
              player={player}
            />
          </div>
          <FullscreenButton
            className={"control-button"}
            player={player}
          />
        </div>
      </div>
    </div>
  );
};

module.exports = withModulesState({
  player: {
    currentTime: "currentTime",
    duration: "duration",
    hasLoadedContent: "hasLoadedContent",
    hasEnded: "hasEnded",
    isLive: "isLive",
  },
})(ControlBar);
