const React = require("react");
const ProgressbarComponent = require("../components/ProgressBar.jsx");
const ImageTip = require("../components/ImageTip.jsx");
const withModulesState = require("../lib/withModulesState.jsx");

class Progressbar extends React.Component {
  constructor(...args) {
    super(...args);
    this.state = {
      imageTipVisible: false,
      imageTipPosition: 0,
      image: null,
    };
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
    const { imageTipVisible, imageTipPosition, image } = this.state;
    const { currentTime, duration, bufferGap, player } = this.props;
    const seek = position => player.dispatch("SEEK", position);
    const onMouseOut = () => this.hideImageTip();
    const onMouseMove = (position, event) => {
      this.showImageTip(position, event.clientX);
    };

    const imageTipOffset = this.wrapperElement ?
      this.wrapperElement.getBoundingClientRect().left : 0;

    return (
      <div
        className="progress-bar-wrapper"
        ref={el => this.wrapperElement = el}
      >
        { imageTipVisible ?
            <ImageTip
              className="progress-tip"
              image={image}
              xPosition={imageTipPosition - imageTipOffset}
            /> : null
        }
        <ProgressbarComponent
          seek={seek}
          onMouseOut={onMouseOut}
          onMouseMove={onMouseMove}
          position={currentTime}
          duration={duration}
          bufferGap={bufferGap}
        />
      </div>
    );
  }
}

module.exports = withModulesState({
  player: {
    bufferGap: "bufferGap",
    currentTime: "currentTime",
    duration: "duration",
    images: "images",
  },
})(Progressbar);
