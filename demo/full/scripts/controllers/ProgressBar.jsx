import React from "react";
import ProgressbarComponent from "../components/ProgressBar.jsx";
import ImageTip from "../components/ImageTip.jsx";
import TimeIndicator from "../components/TimeIndicator.jsx";
import withModulesState from "../lib/withModulesState.jsx";

class Progressbar extends React.Component {
  constructor(...args) {
    super(...args);
    this.state = {
      timeIndicatorVisible: false,
      timeIndicatorPosition: 0,
      timeIndicatorText: "",
      imageTipVisible: false,
      imageTipPosition: 0,
      image: null,
    };
  }

  showTimeIndicator(wallClockTime, clientX) {
    const date = new Date(wallClockTime * 1000);
    const hours = date.getHours().toString().padStart(2, "0");
    const minutes = date.getMinutes().toString().padStart(2, "0");
    const seconds = date.getSeconds().toString().padStart(2, "0");
    const currentReadableTime =  hours + ":" + minutes + ":" + seconds;
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
    const { images } = this.props;
    if (!images || !images.length) {
      return;
    }
    const timestampToMs = ts * 1000;
    const imageIndex = images.findIndex(image =>
      image && image.ts > timestampToMs
    );
    const image = imageIndex === -1 ?
      images[images.length - 1] :
      images[imageIndex - 1];
    if (!image) {
      return;
    }
    this.setState({
      imageTipVisible: true,
      imageTipPosition: clientX,
      image: image.data,
    });
  }

  hideImageTip() {
    this.setState({
      imageTipVisible: false,
      imageTipPosition: 0,
      image: null,
    });
  }

  render() {
    const {
      imageTipVisible,
      imageTipPosition,
      image,
      timeIndicatorVisible,
      timeIndicatorPosition,
      timeIndicatorText,
    } = this.state;
    const {
      currentTime,
      minimumPosition,
      maximumPosition,
      isContentLoaded,
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
      this.showTimeIndicator(wallClockTime, event.clientX);
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
            <ImageTip
              className="progress-tip"
              image={image}
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
    minimumPosition: "minimumPosition",
    maximumPosition: "maximumPosition",
  },
})(Progressbar);
