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
  maximumPosition,
  playbackRate,
  videoElement,
  isContentLoaded,
  isLive,
  isStickingToTheLiveEdge,
  stickToTheLiveEdge,
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
        onSeek={() => stickToTheLiveEdge(false)}
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
        {
          (isContentLoaded && lowLatencyMode) ?
            <Button
              className={"running" + (isStickingToTheLiveEdge ? " clicked" : "")}
              onClick={() => stickToTheLiveEdge(!isStickingToTheLiveEdge)}
              value={
                <svg version="1.1" viewBox="0 0 21.803 21.803">
                		<path d="m18.374 16.605l-4.076-2.101-1.107-1.773-0.757-4.503 2.219 1.092-0.375 1.494c-0.13 0.519 0.185 1.041 0.699 1.17 0.077 0.021 0.157 0.03 0.235 0.03 0.432-2e-3 0.823-0.293 0.935-0.729l0.565-2.25c0.11-0.439-0.103-0.897-0.511-1.101 0 0-5.303-2.603-5.328-2.612-0.406-0.188-0.868-0.267-1.342-0.198-0.625 0.088-1.158 0.407-1.528 0.86-0.029 0.027-2.565 3.15-2.565 3.15l-1.95 0.525c-0.514 0.141-0.818 0.668-0.679 1.184 0.116 0.43 0.505 0.713 0.93 0.713 0.083 0 0.168-0.011 0.252-0.033l2.252-0.606c0.196-0.055 0.37-0.167 0.498-0.324l1.009-1.247 0.725 4.026-1.27 1.01c-0.379 0.304-0.541 0.802-0.411 1.269l1.469 5.271c0.148 0.532 0.633 0.881 1.16 0.881 0.107 0 0.216-0.015 0.324-0.045 0.641-0.178 1.016-0.842 0.837-1.482l-1.254-4.502 1.948-1.498 1.151 1.791c0.115 0.186 0.277 0.334 0.471 0.436l4.371 2.25c0.177 0.092 0.363 0.135 0.552 0.135 0.438 0 0.856-0.238 1.072-0.653 0.303-0.6 0.07-1.325-0.521-1.63z"/>
                		<circle cx="8.602" cy="2.568" r="2.568"/>
                </svg>
              }
            /> : null
        }
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
