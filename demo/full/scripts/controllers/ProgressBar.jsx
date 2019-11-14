import React from "react";
import ProgressbarComponent from "../components/ProgressBar.jsx";
import ToolTip from "../components/ToolTip.jsx";
import withModulesState from "../lib/withModulesState.jsx";
import Thumbnail from "../components/Thumbnail.jsx";
import {
  tap,
  distinctUntilChanged,
  filter,
  map,
} from "rxjs/operators";
import { Subject, combineLatest } from "rxjs";

const { VideoThumbnailLoader } = window.RxPlayerTools;

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
      thumbnailIsVideo: false,
      image: null,
      imageTime: null,
    };

    this.videoElement$ = new Subject();
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

    if (this.videoThumbnailLoader) {
      const { manifest } = this.props;
      if (manifest) {
        const period = manifest.getPeriodForTime(timestampToMs);
        if (period &&
            period.adaptations.video &&
            period.adaptations.video.length) {
          const track = period.adaptations.video[0].representations[1];
          this.videoThumbnailLoader.setTime(Math.floor(timestampToMs), track)
            .catch(() => {
              if (this.vtlSubscription) {
                this.vtlSubscription.unsubscribe();
              }
              this.setState({
                thumbnailIsVideo: false,
              });
              return;
            });
        }
      }
    }
  }

  enableVideoThumbnailMode() {
    const videoElementChange$ = this.videoElement$.pipe(
      filter((videoElement) => videoElement != null),
      distinctUntilChanged()
    );

    const videoAdaptationChange$ = this.props.player.$get("currentAdaptations").pipe(
      filter((adaptations) => adaptations != null && adaptations.video),
      map(({ video }) => video)
    );

    this.vtlSubscription = combineLatest(
      videoElementChange$,
      videoAdaptationChange$
    ).pipe(
      tap(([videoElement, adaptation]) => {
        const firstTrack = adaptation.representations[0];
        this.state.thumbnailIsVideo = true;
        if (this.videoThumbnailLoader) {
          this.videoThumbnailLoader.dispose();
        }
        this.videoThumbnailLoader =
          new VideoThumbnailLoader(videoElement, firstTrack);
      })
    ).subscribe();

    this.setState({
      thumbnailIsVideo: true,
    });
  }

  disableVideoThumbnailMode() {
    if (this.vtlSubscription) {
      this.vtlSubscription.unsubscribe();
    }
    this.setState({
      thumbnailIsVideo: false,
    });
  }

  showImageThumbnail(ts, clientX) {
    const { images } = this.props;
    if (!images || !images.length) {
      this.enableVideoThumbnailMode();
      return;
    }

    this.disableVideoThumbnailMode();
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
      thumbnailIsVisible: true,
      tipPosition: clientX,
      image: image.data,
    });
  }

  showThumbnail(ts, clientX) {
    if (this.state.thumbnailIsVideo) {
      this.showVideoTumbnail(ts, clientX);
    } else {
      this.showImageThumbnail(ts, clientX);
    }
  }

  hideTumbnail() {
    this.setState({
      thumbnailIsVisible: false,
      tipPosition: 0,
      imageTime: null,
      image: null,
    });
  }

  componentWillUnmount() {
    if (this.vtlSubscription) {
      this.vtlSubscription.unsubscribe();
    }
  }

  render() {
    const {
      thumbnailIsVisible,
      tipPosition,
      image,
      timeIndicatorVisible,
      timeIndicatorPosition,
      timeIndicatorText,
      thumbnailIsVideo,
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
      this.hideTumbnail();
    };
    const onMouseMove = (position, event) => {
      const wallClockDiff = player.get("wallClockDiff");
      const wallClockTime = position + wallClockDiff;
      this.showTimeIndicator(wallClockTime, event.clientX, isLive);
      this.showThumbnail(position, event.clientX);
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
          thumbnailIsVisible ? <Thumbnail
            thumbnailIsVideo={thumbnailIsVideo}
            xPosition={xThumbnailPosition}
            image={image}
            setVideoElement={(el) => this.videoElement$.next(el)}
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
    manifest: "manifest",
    bufferGap: "bufferGap",
    currentTime: "currentTime",
    images: "images",
    isContentLoaded: "isContentLoaded",
    isLive: "isLive",
    minimumPosition: "minimumPosition",
    maximumPosition: "maximumPosition",
    currentAdaptations: "currentAdaptations",
  },
})(Progressbar);
