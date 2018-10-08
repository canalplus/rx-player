import React from "react";
import withModulesState from "../lib/withModulesState.jsx";
import Button from "../components/Button.jsx";
import PositionInfos from "../components/PositionInfos.jsx";
import LivePosition from "../components/LivePosition.jsx";
import PlayPauseButton from "./PlayPauseButton.jsx";
import FullscreenButton from "./FullScreenButton.jsx";
import Progressbar from "./ProgressBar.jsx";
import VolumeButton from "./VolumeButton.jsx";
import VolumeBar from "./VolumeBar.jsx";

function ControlBar({
  player,
  videoElement,
  isContentLoaded,
  isLive,
  currentTime,
  duration,
  toggleSettings,
}) {
  const positionElement = (() => {
    if (!isContentLoaded) {
      return null;
    } else if (isLive) {
      return <LivePosition />;
    } else {
      return <PositionInfos
        position={currentTime}
        duration={duration}
      />;
    }
  })();

  const onClickSettings = () => {
    toggleSettings();
  };

  return (
    <div className="controls-bar-container">
      { <Progressbar player={player} /> }
      <div className="controls-bar">
        <PlayPauseButton
          className={"control-button"}
          player={player}
        />
        { positionElement }
        <div className="controls-right-side">
          <div>
            <Button
              disabled={!isContentLoaded}
              className='control-button'
              onClick={onClickSettings}
              value={String.fromCharCode(0xf013)}
            />
          </div>
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
}

export default withModulesState({
  player: {
    isContentLoaded: "isContentLoaded",
    isLive: "isLive",
    currentTime: "currentTime",
    duration: "duration",
  },
})(ControlBar);
