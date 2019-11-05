import React from "react";

/**
 * Props:
 *   - className {string}
 *   - timeText {number}
 *   - xPosition {number}
 * @class ToolTip
 */
class ToolTip extends React.Component {
  constructor(...args) {
    super(...args);

    this.positionIsCorrected = false;
    this.state = {
      style: {},
    };
  }

  componentWillReceiveProps() {
    this.positionIsCorrected = false;
  }

  correctPosition() {
    if (this.positionIsCorrected) {
      return;
    }
    const { xPosition, offset } = this.props;

    if (isNaN(+xPosition) || !this.element) {
      return null;
    }

    const rect = this.element.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const toSlideY = -height - 11;
    const toSlideX = xPosition - offset - width / 2;
    const style = {
      transform: `translate(${toSlideX}px, ${toSlideY}px)`,
    };

    this.positionIsCorrected = true;
    this.setState({ style });
  }

  componentDidMount() {
    this.correctPosition();
  }

  componentDidUpdate() {
    this.correctPosition();
  }

  render() {
    const { className = "", timeText } = this.props;
    const { style } = this.state;
    return (
      <div
        className="tooltip-wrapper"
        style={style}
        ref={el => this.element = el}
      >
        <pre
          className={"tooltip " + className}
        >{timeText}</pre>
      </div>
    );
  }
}

export default ToolTip;
