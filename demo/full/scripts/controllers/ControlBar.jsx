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
  isStopped,
  currentTime,
  duration,
  toggleSettings,
  toggleInfos,
  stopVideo,
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

  const onClickStop = () => {
    stopVideo();
  }

  const onClickInfos = () => {
    toggleInfos();
  };

  const enableDisplayInfos = isLive && isContentLoaded;

  return (
    <div className="controls-bar-container">
      <Progressbar player={player} />
      <div className="controls-bar vjs-fade-out">
        <PlayPauseButton
          className={"control-button"}
          player={player}
        />
        <Button
          className={"control-button"}
          onClick={onClickStop}
          value={String.fromCharCode(0xf04d)}
          disabled={isStopped}
        />
        { positionElement }
        <div className="controls-right-side">
          <Button
            disabled={!enableDisplayInfos}
            className='control-button'
            onClick={onClickInfos}
            value={String.fromCharCode(0xf05a)}
          />
          <Button
            disabled={!isContentLoaded}
            className='control-button'
            onClick={onClickSettings}
            value={String.fromCharCode(0xf013)}
          />
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
    isStopped: "isStopped",
  },
})(ControlBar);
