import React from "react";
import ProgressbarComponent from "../components/ProgressBar.jsx";
import VideoThumbnailTip from "../components/VideoThumbnailTip.jsx";
import TimeIndicator from "../components/TimeIndicator.jsx";
import withModulesState from "../lib/withModulesState.jsx";

class Progressbar extends React.Component {
  constructor(...args) {
    super(...args);

    this.thumbnailsElement = [];

    setInterval(() => {
      const manifest = window.player.getManifest();
      if (manifest) {
        const videoAdaptations = manifest.adaptations.video;
        if (videoAdaptations) {
          this.videoAdaptation = videoAdaptations[0];
        }
      }
    }, 500);
;

    this.state = {
      timeIndicatorVisible: false,
      timeIndicatorPosition: 0,
      timeIndicatorText: "",
      imageTipVisible: false,
      imageTipPosition: 0,
      image: null,
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

    this.setState({
      timeIndicatorVisible: true,
      timeIndicatorPosition: clientX,
      timeIndicatorText: currentReadableTime,
    });
  }

  hideTimeIndicator() {
    this.setState({
      timeIndicatorVisible: false,
      timeIndicatorPosition: 0,
      timeIndicatorText: "",
    });
  }

  showImageTip(ts, clientX) {
    const timestampToMs = ts;
    this.setState({
      imageTipVisible: true,
      imageTipPosition: clientX,
      imageTime: timestampToMs,
    });
  }

  hideImageTip() {
    this.setState({
      imageTipVisible: false,
      imageTipPosition: 0,
      imageTime: null,
    });
  }

  render() {
    const {
      imageTipVisible,
      imageTipPosition,
      imageTime,
      timeIndicatorVisible,
      timeIndicatorPosition,
      timeIndicatorText,
    } = this.state;
    const {
      currentTime,
      minimumPosition,
      maximumPosition,
      isContentLoaded,
      isLive,
      bufferGap,
      player,
    } = this.props;
    const seek = position => player.dispatch("SEEK", position);
    const onMouseOut = () => {
      this.hideTimeIndicator();
      this.hideImageTip();
    };
    const onMouseMove = (position, event) => {
      const wallClockDiff = player.get("wallClockDiff");
      const wallClockTime = position + wallClockDiff;
      this.showTimeIndicator(wallClockTime, event.clientX, isLive);
      this.showImageTip(position, event.clientX);
    };

    const tipsOffset = this.wrapperElement ?
      this.wrapperElement.getBoundingClientRect().left : 0;

    if (!isContentLoaded) {
      return (
        <div className="progress-bar-parent" ref={el => this.wrapperElement = el}>
          <div className="progress-bar-wrapper" />
        </div>
      );
    }

    return (
      <div
        className="progress-bar-parent"
        ref={el => this.wrapperElement = el}
      >
        {
          timeIndicatorVisible ?
            <TimeIndicator
              className="progress-tip"
              timeText={timeIndicatorText}
              xPosition={timeIndicatorPosition - tipsOffset}
            /> : null
        }
        {
          imageTipVisible ?
            <VideoThumbnailTip
              className="progress-tip"
              adaptation={this.videoAdaptation}
              imageTime={imageTime}
              xPosition={imageTipPosition - tipsOffset}
            /> : null
        }
        <ProgressbarComponent
          seek={seek}
          onMouseOut={onMouseOut}
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

export default withModulesState({
  player: {
    bufferGap: "bufferGap",
    currentTime: "currentTime",
    images: "images",
    isContentLoaded: "isContentLoaded",
    isLive: "isLive",
    minimumPosition: "minimumPosition",
    maximumPosition: "maximumPosition",
  },
})(Progressbar);
