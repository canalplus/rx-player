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

class ControlBar extends React.Component {
  constructor(...args) {
    super(...args);
    this.state = {
      isCatchingUp: false,
      isStickingToTheLiveEdge: true,
      lowLatencyMode: undefined,
    };
  }

  render() {
    const changeStickToLiveEdge = (shouldStick) => {
      this.setState({ isStickingToTheLiveEdge: shouldStick });
    };

    const { isCatchingUp,
            isStickingToTheLiveEdge } = this.state;

    const {
      isContentLoaded,
      isLive,
      currentTime,
      duration,
      stopVideo,
      isStopped,
      player,
      maximumPosition,
      playbackRate,
      playbackPosition,
      videoElement,
      toggleSettings,
      lowLatencyMode,
      liveGap,
    } = this.props;

    let isCloseToLive = undefined;
    if (lowLatencyMode != null && liveGap != null) {
      isCloseToLive = lowLatencyMode ? liveGap < 7 : liveGap < 15;
    }

    if (player) {
      const shouldCatchUp = (liveGap > 7 || isCatchingUp && liveGap > 5) &&
                            isStickingToTheLiveEdge &&
                            lowLatencyMode;
      if (shouldCatchUp) {
        if (liveGap > 10) {
          player.dispatch("SEEK", maximumPosition - 5);
        } else {
          const factor = (liveGap - 5) / 4;
          const rate = Math.round(
            (liveGap > 5 ? Math.min(10, 1.1 + factor) : 1) * 10
          ) / 10;
          if (rate !== playbackPosition) {
            this.setState({ isCatchingUp: true });
            player.dispatch("SET_PLAYBACK_RATE", rate);
          }
        }
      } else if (isCatchingUp) {
        this.setState({ isCatchingUp: false });
        player.dispatch("SET_PLAYBACK_RATE", 1);
      }
    }

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
          {positionElement}
          {isContentLoaded ?
            <Button
              className={"dot" + ((isCloseToLive && !isCatchingUp) ? " live" : "")}
              onClick={() => {
                if (isCatchingUp || !isCloseToLive) {
                  player.dispatch("SEEK", maximumPosition - (lowLatencyMode ? 4 : 10));
                }
              }}
            /> : null}
          <div className="controls-right-side">
            {(isLive && lowLatencyMode && playbackRate !== 1) ?
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
