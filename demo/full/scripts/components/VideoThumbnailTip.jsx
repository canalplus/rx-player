import React from "react";

const { VideoThumbnailLoader } = window.RxPlayerTools;

/**
 * React Component which Displays a video thumbnail tip centered and on top
 * of the position wanted.
 *
 * Takes 2 props:
 *   - {Object} Adaptation - The adaptation that carries the thumbnail track
 *   - {number} Image time - The media time of the image to display
 *
 * @class VideoThumbnailTip
 */
class VideoThumbnailTip extends React.Component {
  constructor(...args) {
    super(...args);

    this.adaptation = this.props.adaptation;
    this.imageTime = Math.floor(this.props.imageTime);
    this.imageLoader = null;
    this.positionIsCorrected = false;
    this.state = {
      style: {},
    };
  }

  correctImagePosition() {
    if (this.positionIsCorrected) {
      return;
    }
    const { xPosition } = this.props;

    if (isNaN(+xPosition) || !this.element) {
      return null;
    }

    const style = {
      transform: `translate(${xPosition}px, -136px)`,
    };

    this.positionIsCorrected = true;
    this.setState({ style });
  }

  componentWillReceiveProps(nextProps) {
    this.positionIsCorrected = false;
    const { imageTime } = nextProps;
    const flooredImageTime = Math.round(imageTime);
    if (this.imageLoader) {
      this.imageLoader.setTime(flooredImageTime);
      this.imageTime = flooredImageTime;
    }
  }

  componentDidMount() {
    this.correctImagePosition();
  }

  componentWillUnmount() {
    if (this.imageLoader) {
      this.imageLoader.dispose();
    }
  }

  componentDidUpdate() {
    this.correctImagePosition();
  }

  render() {
    const { style } = this.state;

    const videoElement = <video
      ref={el => {
        const track = this.adaptation.trickModeTrack && this.adaptation.trickModeTrack.representations ?
          this.adaptation.trickModeTrack.representations[0] : undefined;
        if (!this.imageLoader && track) {

          this.imageLoader = VideoThumbnailLoader(el, track);
        }
        this.imageLoader.setTime(this.imageTime);
      }}
    ></video>

    const divToDisplay = <div
        className="image-tip-wrapper"
        style={style}
        ref={el => this.element = el}
      >
        { videoElement }
      </div>;

    return (
      divToDisplay
    );
  }
}

export default VideoThumbnailTip;
