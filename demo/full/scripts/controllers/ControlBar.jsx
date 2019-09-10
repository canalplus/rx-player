import React from "react";
import withModulesState from "../lib/withModulesState.jsx";
import Button from "../components/Button.jsx";
import PositionInfos from "../components/PositionInfos.jsx";
import LivePosition from "../components/LivePosition.jsx";
import PlayPauseButton from "./PlayPauseButton.jsx";
import StickToLiveEdgeButton from "./StickToLiveEdgeButton.jsx";
import FullscreenButton from "./FullScreenButton.jsx";
import Progressbar from "./ProgressBar.jsx";
import VolumeButton from "./VolumeButton.jsx";
import VolumeBar from "./VolumeBar.jsx";

function ControlBar({
  player,
  maximumPosition,
  playbackRate,
  videoElement,
  isContentLoaded,
  isLive,
  isStickingToTheLiveEdge,
  changeStickToLiveEdge,
  isStopped,
  currentTime,
  duration,
  toggleSettings,
  stopVideo,
  lowLatencyMode,
  liveGap,
  isCatchingUp,
}) {
  const isNearLiveEdge = lowLatencyMode ? liveGap < 7 : liveGap < 15;
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

  return (
    <div className="controls-bar-container">
      <Progressbar
        player={player}
        onSeek={() => changeStickToLiveEdge(false)}
      />
      <div className="controls-bar">
        <PlayPauseButton
          className={"control-button"}
          player={player}
        />
        <Button
          className={"control-button"}
          onClick={stopVideo}
          value={String.fromCharCode(0xf04d)}
          disabled={isStopped}
        />
        <StickToLiveEdgeButton
          isContentLoaded={isContentLoaded}
          lowLatencyMode={lowLatencyMode}
          isStickingToTheLiveEdge={isStickingToTheLiveEdge}
          changeStickToLiveEdge={changeStickToLiveEdge}
        />
        { positionElement }
        { isContentLoaded ?
          <Button
            className={"dot" + ((isNearLiveEdge && !isCatchingUp) ? " live" : "")}
            onClick={() => {
              if (isCatchingUp || liveGap > (lowLatencyMode ? 7 : 15)) {
                player.dispatch("SEEK", maximumPosition - (lowLatencyMode ? 4 : 10));
              }
            }}
          /> : null }
        <div className="controls-right-side">
          { (isLive && lowLatencyMode && playbackRate !== 1) ?
            <div className="catch-up">
              {"Catch-up playback rate: " + playbackRate}
            </div> : null
          }
          <Button
            disabled={!isContentLoaded}
            className='control-button'
            onClick={toggleSettings}
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
    maximumPosition: "maximumPosition",
    playbackRate: "playbackRate",
    isLive: "isLive",
    currentTime: "currentTime",
    duration: "duration",
    isStopped: "isStopped",
    lowLatencyMode: "lowLatencyMode",
    liveGap: "liveGap",
  },
})(ControlBar);
