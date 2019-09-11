import React from "react";
import withModulesState from "../lib/withModulesState.jsx";
import Button from "../components/Button.jsx";
import PositionInfos from "../components/PositionInfos.jsx";
import LivePosition from "../components/LivePosition.jsx";
import StickToLiveEdgeButton from "../components/StickToLiveEdgeButton.jsx";
import PlayPauseButton from "./PlayPauseButton.jsx";
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
      videoElement,
      toggleSettings,
      lowLatencyMode,
      liveGap,
    } = this.props;

    let isCloseToLive = undefined;
    if (lowLatencyMode != null && liveGap != null) {
      isCloseToLive = lowLatencyMode ? liveGap < 7 : liveGap < 15;
    }

    if (isCatchingUp && isStopped) {
      // We stopped the player while catching up. Reset playback rate
      player.dispatch("SET_PLAYBACK_RATE", 1);
      this.setState({ isCatchingUp: false });
    }

    /**
     * Catch-up :
     * - If current position is too far from live edge,
     * then we should seek near to live edge.
     * - If not, changed playback rate in order to move back
     * close to the live.
     */
    const catchUp = () => {
      if (liveGap > 10) {
        player.dispatch("SEEK", maximumPosition - 5);
      } else {
        const factor = (liveGap - 5) / 4;
        const rate = Math.round(
          (liveGap > 5 ? Math.min(10, 1.1 + factor) : 1) * 10
        ) / 10;
        if (rate !== playbackRate) {
          this.setState({ isCatchingUp: true });
          player.dispatch("SET_PLAYBACK_RATE", rate);
        }
      }
    };

    if (player) {
      const shouldCatchUp = isContentLoaded &&
                            (liveGap > 7 || isCatchingUp && liveGap > 5) &&
                            isStickingToTheLiveEdge &&
                            lowLatencyMode;
      if (shouldCatchUp) {
        catchUp();
      } else if (isCatchingUp) {
        player.dispatch("SET_PLAYBACK_RATE", 1);
        this.setState({ isCatchingUp: false });
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

    const isAtLiveEdge = isLive && isCloseToLive && !isCatchingUp;

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
          {
            (isContentLoaded && lowLatencyMode) ?
              <StickToLiveEdgeButton
                isStickingToTheLiveEdge={isStickingToTheLiveEdge}
                changeStickToLiveEdge={changeStickToLiveEdge}
              /> : null
          }
          {positionElement}
          {isLive && isContentLoaded ?
            <Button
              className={"dot" + (isAtLiveEdge ? " live" : "")}
              onClick={() => {
                if (!isAtLiveEdge) {
                  player.dispatch("SEEK", maximumPosition - (lowLatencyMode ? 4 : 10));
                }
              }}
            /> : null}
          <div className="controls-right-side">
            {isCatchingUp ?
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
