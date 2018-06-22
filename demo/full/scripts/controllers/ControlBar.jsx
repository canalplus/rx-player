import React from "react";
import withModulesState from "../lib/withModulesState.jsx";
import Button from "../components/Button.jsx";
import PositionInfos from "../components/PositionInfos.jsx";
import LivePosition from "../components/LivePosition.jsx";
import PlayPauseButton from "./PlayPauseButton.jsx";
import PreviousProgramButton from "./PreviousProgramButton.js";
import NextProgramButton from "./NextProgramButton.js";
import LiveProgramButton from "./LiveProgramButton.js";
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
      <Progressbar player={player} />
      <div className="controls-bar">
        <PlayPauseButton
          className={"control-button"}
          player={player}
        />
        { positionElement }
        <div className="controls-right-side">
          <Button
            disabled={!isContentLoaded}
            className='control-button'
            onClick={onClickSettings}
            value={String.fromCharCode(0xf013)}
          />
          <div className="prev-next-prog">
            <LiveProgramButton
              className={"control-button"}
              player={player}
              videoElement={videoElement}
            />
            <PreviousProgramButton
              className={"control-button"}
              player={player}
              videoElement={videoElement}
            />
            <NextProgramButton
              className={"control-button"}
              player={player}
              videoElement={videoElement}
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
