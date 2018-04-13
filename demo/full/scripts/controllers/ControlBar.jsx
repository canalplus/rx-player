import React from "react";
import withModulesState from "../lib/withModulesState.jsx";
import PositionInfos from "../components/PositionInfos.jsx";
import LivePosition from "../components/LivePosition.jsx";
// import SettingsButton from "./SettingsButton.jsx";
import PlayPauseButton from "./PlayPauseButton.jsx";
import FullscreenButton from "./FullScreenButton.jsx";
import Progressbar from "./ProgressBar.jsx";
import VolumeButton from "./VolumeButton.jsx";
import VolumeBar from "./VolumeBar.jsx";

const ControlBar = ({
  currentTime,
  duration,
  hasLoadedContent,
  isLive,
  player,
  videoElement,
}) => {
  const displayControls = hasLoadedContent;

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
      { (!displayControls) ?
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
            videoElement={videoElement}
          />
        </div>
      </div>
    </div>
  );
};

export default withModulesState({
  player: {
    currentTime: "currentTime",
    duration: "duration",
    hasLoadedContent: "hasLoadedContent",
    isLive: "isLive",
  },
})(ControlBar);
