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
    this._isMounted = true;

    /**
     * Timeout before loading a thumbnail, to avoid triggering to many requests
     * in a row.
     */
    this._loadThumbnailTimeout = null;

    /**
     * Timeout before displaying the spinner, for when loading a thumbnail takes
     * too much time.
     */
    this._spinnerTimeout = null;

    this.positionIsCorrected = false;
    this.state = {
      style: {},
      divSpinnerStyle: {
        "backgroundColor": "gray",
        "position": "absolute",
        "width": "100%",
        "height": "100%",
        "opacity": "50%",
        "display": "flex",
        "justifyContent": "center",
        "alignItems": "center",
      },
      spinnerStyle: {
        "width": "50%",
        "margin": "auto",
      },
      displaySpinner : true,
    };
    this.lastSetTime = undefined;
    if (this.props.videoThumbnailsData === null) {
      this.props.player.dispatch("ATTACH_VIDEO_THUMBNAIL_LOADER");
    }
    this.element  = React.createRef();
  }

  correctImagePosition() {
    if (this.positionIsCorrected) {
      return;
    }
    const { xPosition } = this.props;

    if (isNaN(+xPosition) || this.element.current === null) {
      return null;
    }

    const style = {
      transform: `translate(${xPosition}px, -136px)`,
    };

    this.positionIsCorrected = true;
    this.setState({ style });
  }

  /**
   * Display a spinner after some delay if `stopSpinnerTimeout` hasn't been
   * called since.
   * This function allows to schedule a spinner if the request to display a
   * thumbnail takes too much time.
   */
  startSpinnerTimeoutIfNotAlreadyStarted() {
    if (this._spinnerTimeout !== null) {
      return;
    }

    // Wait a little before displaying spinner, to
    // be sure loading takes time
    this._spinnerTimeout = setTimeout(() => {
      this._spinnerTimeout = null;
      if (this.state.displaySpinner !== true) {
        this.setState({ displaySpinner: true });
      }
    }, 150);
  }

  /**
   * Hide the spinner if one is active and stop the last started spinner
   * timeout.
   * Allow to avoid showing a spinner when the thumbnail we were waiting for
   * was succesfully loaded.
   */
  hideSpinner() {
    if (this._spinnerTimeout !== null) {
      clearTimeout(this._spinnerTimeout);
      this._spinnerTimeout = null;
    }

    if (this.state.displaySpinner !== false) {
      this.setState({ displaySpinner: false });
    }
  }

  // TODO think about what to do about that one now
  // (This function was there as is a very long time ago and I did not keep up
  // to date with React to know what the new idiomatic way is).
  // Nothing unsafe about this though
  UNSAFE_componentWillReceiveProps() {
    this.positionIsCorrected = false;
  }

  componentDidMount() {
    if (this.props.videoThumbnailsData !== null &&
        this.element.current !== null)
    {
      this.element.current
        .appendChild(this.props.videoThumbnailsData.videoElement);
    }
    this.correctImagePosition();
  }

  componentDidUpdate() {
    if (this.props.videoThumbnailsData !== null &&
        this.element.current !== null)
    {
      this.element.current
        .appendChild(this.props.videoThumbnailsData.videoElement);
    }
    this.correctImagePosition();
  }

  componentWillUnmount() {
    this.hideSpinner();
    this._isMounted = false;
  }

  render() {
    const { style, divSpinnerStyle, spinnerStyle } = this.state;

    const thumbnailsData = this.props.videoThumbnailsData;

    const { time } = this.props;
    const roundedTime = Math.round(time);

    if (thumbnailsData !== null && this.lastSetTime !== roundedTime) {
      this.startSpinnerTimeoutIfNotAlreadyStarted();

      if (this._loadThumbnailTimeout !== null) {
        clearTimeout(this._loadThumbnailTimeout);
      }

      // load thumbnail after a 40ms timer to avoid doing too many requests
      // when the user quickly moves its pointer or whatever is calling this
      this._loadThumbnailTimeout = setTimeout(() => {
        this._loadThumbnailTimeout = null;
        thumbnailsData.videoThumbnailLoader.setTime(roundedTime)
          .then(() => {
            if (time !== this.props.time || !this._isMounted) {
              return;
            }
            this.hideSpinner();
          })
          .catch(() => {
            if (time !== this.props.time || !this._isMounted) {
              return;
            }
            this.hideSpinner();
          });
      }, 40);
    }

    const divToDisplay = <div
      className="thumbnail-wrapper"
      style={style}
      ref={this.element}
    >
      {
        this.state.displaySpinner ?
          <div style={divSpinnerStyle}>
            <img
              src="./assets/spinner.gif"
              style={spinnerStyle}
            />
          </div> :
          null
      }
    </div>;

    return (
      divToDisplay
    );
  }
}

export default React.memo(withModulesState({
  player: {
    videoThumbnailsData: "videoThumbnailsData"
  },
})(VideoThumbnail));
