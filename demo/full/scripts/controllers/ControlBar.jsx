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

class ControlBar extends React.Component {
  onClickSettings() {
    this.props.toggleSettings();
  }

  render() {
    const {
      player,
      videoElement,
      isContentLoaded,
      isLive,
      currentTime,
      duration,
    } = this.props;
    const displayProgressBar = isContentLoaded;

    let positionElement;
    if (!displayProgressBar) {
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
        { (!displayProgressBar) ?
          null : <Progressbar player={player} />
        }
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
                onClick={
                  () => {
                    this.onClickSettings();
                  }
                }
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
}

export default withModulesState({
  player: {
    isContentLoaded: "isContentLoaded",
    isLive: "isLive",
    currentTime: "currentTime",
    duration: "duration",
  },
})(ControlBar);
