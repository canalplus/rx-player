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

// Distance from live edge we try to reach when the catching up button
// is enabled.
const LIVE_GAP_GOAL_WHEN_CATCHING_UP = 5;

// Distance from live edge from which we are considered too far too just
// change the playback rate. In the case the current distance is superior
// to that value, we will seek to a LIVE_GAP_GOAL_WHEN_CATCHING_UP distance
// directly instead.
const CATCH_UP_SEEKING_STEP = 10;

// Maximum playback rate we can set when catching up.
const MAX_RATE = 10;

class ControlBar extends React.Component {
  constructor(...args) {
    super(...args);
    this.state = {
      isCatchingUp: false,
      stickToTheLiveEdgeInLowLatencyMode: true,
    };
  }

  render() {
    const changeStickToLiveEdge = (shouldStick) => {
      this.setState({ stickToTheLiveEdgeInLowLatencyMode: shouldStick });
    };

    const { isCatchingUp,
            stickToTheLiveEdgeInLowLatencyMode } = this.state;

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
    const checkCatchUp = () => {
      if (player == null) {
        return;
      }
      if (liveGap > CATCH_UP_SEEKING_STEP) {
        player.dispatch("SEEK", maximumPosition - LIVE_GAP_GOAL_WHEN_CATCHING_UP);
      } else if (liveGap <= LIVE_GAP_GOAL_WHEN_CATCHING_UP) { // we're done
        if (!this.state.isCatchingUp) {
          return;
        }
        player.dispatch("SET_PLAYBACK_RATE", 1);
        this.setState({ isCatchingUp: false });
      } else {
        const factor = (liveGap - LIVE_GAP_GOAL_WHEN_CATCHING_UP) / 4;
        const rate = Math.round(Math.min(MAX_RATE, 1.1 + factor) * 10) / 10;
        if (!this.state.isCatchingUp) {
          this.setState({ isCatchingUp: true });
        }
        if (rate !== playbackRate) {
          player.dispatch("SET_PLAYBACK_RATE", rate);
        }
      }
    };

    if (isContentLoaded &&
        lowLatencyMode &&
        stickToTheLiveEdgeInLowLatencyMode) {
      checkCatchUp();
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
                isStickingToTheLiveEdge={stickToTheLiveEdgeInLowLatencyMode}
                changeStickToLiveEdge={() =>
                  changeStickToLiveEdge(!stickToTheLiveEdgeInLowLatencyMode)
                }
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
