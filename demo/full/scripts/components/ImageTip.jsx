import React from "react";

/**
 * React Component which Displays an Image tip centered and on top of the
 * position wanted.
 *
 * Takes 3 props:
 *   - {Blob|string} Image - The image blob to display
 *   - {string} [className=""] - An optional className for the image
 *   - {Number} xPosition - The position on the horizontal axis where you
 *     want the image to be centered to.
 *
 * @class ImageTip
 */
class ImageTip extends React.Component {
  constructor(...args) {
    super(...args);

    const { image } = this.props;
    this.attachBIFImage(image);

    this.positionIsCorrected = false;
    this.state = {
      style: {},
    };
  }

  attachBIFImage(image) {
    if (this.imageUrl) {
      URL.revokeObjectURL(this.imageUrl);
      this.imageUrl = "";
    }

    const blob = new Blob([image], {type: "image/jpeg"});
    const url = URL.createObjectURL(blob);
    this.imageUrl = url;
  }

  componentWillReceiveProps(nextProps) {
    this.positionIsCorrected = false;
    const { image } = nextProps;
    if (this.props.image !== image) {
      this.attachBIFImage(image);
    }
  }

  componentWillUnmount() {
    URL.revokeObjectURL(this.imageUrl);
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

  componentDidMount() {
    this.correctImagePosition();
  }

  componentDidUpdate() {
    this.correctImagePosition();
  }

  render() {
    const { className = "" } = this.props;
    const { imageUrl } = this;
    const { style } = this.state;

    return (
      <div
        className="image-tip-wrapper"
        style={style}
        ref={el => this.element = el}
      >
        <img
          className={"image-tip " + className}
          src={imageUrl}
        />
      </div>
    );
  }
}

export default ImageTip;
