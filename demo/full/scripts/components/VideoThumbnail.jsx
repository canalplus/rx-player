import React from "react";
import withModulesState from "../lib/withModulesState";

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
    this.positionIsCorrected = false;
    this.state = {
      style: {},
      divSpinnerStyle: {
        "background-color": "gray",
        "position": "absolute",
        "width": "100%",
        "height": "100%",
        "opacity": "50%",
        "display": "flex",
        "justify-content": "center",
        "align-items": "center",
      },
      spinnerStyle: {
        "width": "50%",
        "margin": "auto",
      },
      displaySpinner : true,
    };
    this.lastSetTime = undefined;
    this._videoElement = undefined;
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

  showSpinner() {
    if (this.state.displaySpinner !== true) {
      this.setState({ displaySpinner: true });
    }
  }

  hideSpinner() {
    if (this.state.displaySpinner !== false) {
      this.setState({ displaySpinner: false });
    }
  }

  componentWillReceiveProps() {
    this.positionIsCorrected = false;
  }

  componentDidMount() {
    this.correctImagePosition();
    if (this._videoElement !== undefined) {
      this.props.player.dispatch("ATTACH_VIDEO_THUMBNAIL_LOADER", this._videoElement);
    }
  }

  componentDidUpdate() {
    this.correctImagePosition();
  }

  componentWillUnmount() {
    const { player, attachedVideoThumbnailLoader } = this.props;
    const videoThumbnailLoader = attachedVideoThumbnailLoader;
    if (videoThumbnailLoader) {
      videoThumbnailLoader.dispose();
      player.dispatch("REMOVE_VIDEO_THUMBNAIL_LOADER");
    }
    this._videoElement = undefined;
  }

  render() {
    const { style, divSpinnerStyle, spinnerStyle } = this.state;

    const videoThumbnailLoader = this.props.attachedVideoThumbnailLoader;
    if (videoThumbnailLoader) {
      const { time } = this.props;
      const roundedTime = Math.round(time);
      let spinnerTimeout;
      // Only show spinner when time has changed
      if (this.lastSetTime !== roundedTime) {
        // Wait a little before displaying spinner, to
        // be sure loading takes time
        spinnerTimeout = setTimeout(() => {
          this.showSpinner();
        }, 300);
      }
      this.lastSetTime = roundedTime;
      videoThumbnailLoader.setTime(roundedTime)
        .then(() => {
          clearTimeout(spinnerTimeout);
          this.hideSpinner();
        })
        .catch(() => {
          clearTimeout(spinnerTimeout);
          this.hideSpinner();
        });
    }

    const divToDisplay = <div
      className="thumbnail-wrapper"
      style={style}
      ref={el => this.element = el}
    >
      {
        this.state.displaySpinner ?
          <div style={divSpinnerStyle}>
            <img
              src="../assets/spinner.gif"
              style={spinnerStyle}
            />
          </div> :
          null
      }
      <video ref={(videoElement) => {
        if (videoElement !== null) {
          this._videoElement = videoElement;
        }
      }}></video>
    </div>;

    return (
      divToDisplay
    );
  }
}

export default React.memo(withModulesState({
  player: {
    attachedVideoThumbnailLoader: "attachedVideoThumbnailLoader"
  },
})(VideoThumbnail));