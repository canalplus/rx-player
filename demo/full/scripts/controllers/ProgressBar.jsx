import React from "react";
import ProgressbarComponent from "../components/ProgressBar.jsx";
import ToolTip from "../components/ToolTip.jsx";
import VideoThumbnail from "../components/VideoThumbnail";
import withModulesState from "../lib/withModulesState.jsx";

class Progressbar extends React.Component {
  constructor(...args) {
    super(...args);

    this.thumbnailsElement = [];
    this.subscription = null;
    this.state = {
      timeIndicatorVisible: false,
      timeIndicatorPosition: 0,
      timeIndicatorText: "",
      thumbnailIsVisible: false,
      tipPosition: 0,
      imageTime: null,
    };
  }

  showTimeIndicator(wallClockTime, clientX, isLive) {
    let hours;
    let minutes;
    let seconds;
    if (isLive) {
      const date = new Date(wallClockTime * 1000);
      hours = date.getHours();
      minutes = date.getMinutes();
      seconds = date.getSeconds();
    } else {
      hours = Math.floor(wallClockTime / 3600);
      minutes = Math.floor((wallClockTime - (hours * 3600)) / 60);
      seconds = Math.floor(wallClockTime - ((minutes * 60) + (hours * 3600)));
    }
    const currentReadableTime = hours.toString().padStart(2, "0") + ":" +
      minutes.toString().padStart(2, "0") + ":" +
      seconds.toString().padStart(2, "0");

    this.setState({ timeIndicatorVisible: true,
                    timeIndicatorPosition: clientX,
                    timeIndicatorText: currentReadableTime });
  }

  hideTimeIndicator() {
    this.setState({ timeIndicatorVisible: false,
                    timeIndicatorPosition: 0,
                    timeIndicatorText: "" });
  }

  showVideoTumbnail(ts, clientX) {
    const timestampToMs = ts;
    this.setState({
      thumbnailIsVisible: true,
      tipPosition: clientX,
      imageTime: timestampToMs,
    });
  }

  showThumbnail(ts, clientX, enableVideoThumbnails) {
    if (enableVideoThumbnails) {
      this.showVideoTumbnail(ts, clientX);
    }
  }

  hideTumbnail() {
    this.setState({
      thumbnailIsVisible: false,
      tipPosition: 0,
      imageTime: null,
    });
  }

  render() {
    const {
      thumbnailIsVisible,
      tipPosition,
      timeIndicatorVisible,
      timeIndicatorPosition,
      timeIndicatorText,
      imageTime,
    } = this.state;
    const {
      currentTime,
      minimumPosition,
      maximumPosition,
      isContentLoaded,
      isLive,
      bufferGap,
      player,
      enableVideoThumbnails,
    } = this.props;
    const seek = position => player.dispatch("SEEK", position);
    const hideToolTips = () => {
      this.hideTimeIndicator();
      this.hideTumbnail();
    };
    const onMouseMove = (position, event) => {
      const wallClockDiff = player.get("wallClockDiff");
      const wallClockTime = position + wallClockDiff;
      this.showTimeIndicator(wallClockTime, event.clientX, isLive);
      this.showThumbnail(position, event.clientX, enableVideoThumbnails);
    };

    const toolTipOffset = this.wrapperElement ?
      this.wrapperElement.getBoundingClientRect().left : 0;

    if (!isContentLoaded) {
      return (
        <div className="progress-bar-parent" ref={el => this.wrapperElement = el}>
          <div className="progress-bar-wrapper" />
        </div>
      );
    }

    const xThumbnailPosition = tipPosition - toolTipOffset;
    return (
      <div
        className="progress-bar-parent"
        ref={el => this.wrapperElement = el}
      >
        {
          timeIndicatorVisible ?
            <ToolTip
              className="progress-tip"
              text={timeIndicatorText}
              xPosition={timeIndicatorPosition}
              offset={toolTipOffset}
            /> : null
        }
        {
          thumbnailIsVisible && enableVideoThumbnails ?
            <VideoThumbnail
              xPosition={xThumbnailPosition}
              time={imageTime}
              player={player}
            /> :
            null
        }
        <ProgressbarComponent
          seek={seek}
          onMouseOut={hideToolTips}
          onMouseMove={onMouseMove}
          position={currentTime}
          minimumPosition={minimumPosition}
          maximumPosition={maximumPosition}
          bufferGap={bufferGap}
        />
      </div>
    );
  }
}

export default React.memo(withModulesState({
  player: {
    bufferGap: "bufferGap",
    currentTime: "currentTime",
    isContentLoaded: "isContentLoaded",
    isLive: "isLive",
    minimumPosition: "minimumPosition",
    maximumPosition: "maximumPosition",
  },
})(Progressbar));
