import React from "react";

/**
 * React Component which Displays a video thumbnail centered and on top
 * of the position wanted.
 *
 * Takes 2 props:
 *   - {Object} Adaptation - The adaptation that carries the thumbnail track
 *   - {number} Image time - The media time of the image to display
 *
 * @class VideoThumbnailTip
 */
class VideoThumbnail extends React.Component {
  constructor(...args) {
    super(...args);

    this.setVideoElement = this.props.setVideoElement;
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

  componentWillReceiveProps() {
    this.positionIsCorrected = false;
  }

  componentDidMount() {
    this.correctImagePosition();
  }

  componentDidUpdate() {
    this.correctImagePosition();
  }

  render() {
    const { style } = this.state;

    const divToDisplay = <div
      className="thumbnail-wrapper"
      style={style}
      ref={el => this.element = el}
    >
      <video ref={ el => this.setVideoElement(el) }></video>
    </div>;

    return (
      divToDisplay
    );
  }
}

export default VideoThumbnail;
