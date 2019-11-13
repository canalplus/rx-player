import React from "react";
import ProgressbarComponent from "../components/ProgressBar.jsx";
import ToolTip from "../components/ToolTip.jsx";
import withModulesState from "../lib/withModulesState.jsx";
import Tip from "../components/Tip.jsx";

const { VideoThumbnailLoader } = window.RxPlayerTools;

class Progressbar extends React.Component {
  constructor(...args) {
    super(...args);

    this.thumbnailsElement = [];
    this.videoElement = null;

    this.state = {
      timeIndicatorVisible: false,
      timeIndicatorPosition: 0,
      timeIndicatorText: "",
      tipVisible: false,
      tipPosition: 0,
      tipIsVideo: true,
      image: null,
      imageTime: null,
    };
  }

  setVideoThumbnailLoader(videoElement) {
    if (videoElement === null ||
        videoElement === this.videoElement) {
      return;
    }

    this.videoElement = videoElement;
    const adaptations = window.player.getCurrentAdaptations();
    if (adaptations && adaptations.video) {
      const adaptation = adaptations.video;
      const firstTrack = adaptation.representations[0];
      if (this.videoThumbnailLoader) {
        this.videoThumbnailLoader.dispose();
      }
      this.state.tipIsVideo = true;
      this.videoThumbnailLoader =
        new VideoThumbnailLoader(this.videoElement, firstTrack);
    }

    window.player.addEventListener("videoTrackChange", () => {
      const adaptation = window.player.getCurrentAdaptations().video;
      const firstTrack = adaptation.representations[0];
      if (this.videoThumbnailLoader) {
        this.videoThumbnailLoader.dispose();
      }
      this.state.tipIsVideo = true;
      this.videoThumbnailLoader =
        new VideoThumbnailLoader(this.videoElement, firstTrack);
    });
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

  showTip(ts, clientX) {
    if (this.state.tipIsVideo) {
      const timestampToMs = ts;
      this.setState({
        tipVisible: true,
        tipPosition: clientX,
        imageTime: timestampToMs,
      });

      if (this.videoThumbnailLoader) {
        const manifest = window.player.getManifest();
        if (manifest) {
          const period = manifest.getPeriodForTime(timestampToMs);
          if (period &&
              period.adaptations.video &&
              period.adaptations.video.length) {
            const track = period.adaptations.video[0].representations[1];
            this.videoThumbnailLoader.setTime(Math.floor(timestampToMs), track);
          }
        }
      }
    } else {
      const { images } = this.props;
      if (!images || !images.length) {
        return;
      }
      const timestampToMs = ts * 1000;
      const imageIndex = images.findIndex(i =>
        i && i.ts > timestampToMs
      );
      const image = imageIndex === -1 ?
        images[images.length - 1] :
        images[imageIndex - 1];
      if (!image) {
        return;
      }
      this.setState({
        tipVisible: true,
        tipPosition: clientX,
        image: image.data,
      });
    }
  }

  hideTip() {
    this.setState({
      tipVisible: false,
      tipPosition: 0,
      imageTime: null,
      image: null,
    });
  }

  render() {
    const {
      tipVisible,
      tipPosition,
      image,
      timeIndicatorVisible,
      timeIndicatorPosition,
      timeIndicatorText,
      tipIsVideo,
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
    const hideToolTips = () => {
      this.hideTimeIndicator();
      this.hideTip();
    };
    const onMouseMove = (position, event) => {
      const wallClockDiff = player.get("wallClockDiff");
      const wallClockTime = position + wallClockDiff;
      this.showTimeIndicator(wallClockTime, event.clientX, isLive);
      this.showTip(position, event.clientX);
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
          tipVisible ? <Tip
            tipIsVideo={tipIsVideo}
            tipsOffset={toolTipOffset}
            image={image}
            tipPosition={tipPosition}
            setVideoThumbnailLoader={(el) => this.setVideoThumbnailLoader(el)}
          /> : null
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
