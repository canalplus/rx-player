import React from "react";

/**
 * Props:
 *   - className {string}
 *   - timeText {number}
 *   - xPosition {number}
 * @class TimeIndicator
 */
class TimeIndicator extends React.Component {
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
    const { xPosition } = this.props;

    if (isNaN(+xPosition) || !this.element) {
      return null;
    }

    const rect = this.element.getBoundingClientRect();
    const width = rect.width;

    const style = {
      transform: `translate(${xPosition - width/2}px, -35px)`,
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
        className="time-indicator-wrapper"
        style={style}
        ref={el => this.element = el}
      >
        <span
          className={"time-indicator " + className}
        >{timeText}</span>
      </div>
    );
  }
}

export default TimeIndicator;
