import React from "react";
import { createModule } from "../../lib/vespertine.js";
import ChartDataModule from "../../modules/ChartData.js";
import BufferContentChart from "./BufferContent.jsx";

const BUFFER_GAP_REFRESH_TIME = 500;
const MAX_BUFFER_SIZE_LENGTH = 2000;

class ChartsManager extends React.Component {
  constructor(...args) {
    super(...args);
    this.state = { displayBufferContentChart: false };
    const { player } = this.props;

    this.bufferSizeChart = createModule(ChartDataModule,
                                        { maxSize: MAX_BUFFER_SIZE_LENGTH });

    this.bufferSizeChart.dispatch("ADD_DATA", player.get("bufferGap"));
    this.bufferGapInterval = setInterval(() => {
      this.bufferSizeChart.dispatch("ADD_DATA", player.get("bufferGap"));
    }, BUFFER_GAP_REFRESH_TIME);
  }

  componentWillUnmount() {
    clearInterval(this.bufferGapInterval);
    this.bufferSizeChart.destroy();
  }

  render() {
    const { displayBufferContentChart } = this.state;
    const { player } = this.props;

    const onBufferContentCheckBoxChange = (e) => {
      const target = e.target;
      const value = target.type === "checkbox" ?
        target.checked : target.value;
      this.setState({ displayBufferContentChart: value });
    };
    return (
      <div className="player-charts">
        <div className="player-box">
          <div className="chart-checkbox" >
            Buffer content chart
            <label className="switch">
              <input
                name="displayBufferContentChart"
                type="checkbox"
                aria-label="Display/Hide chart about the buffer's content"
                checked={this.state.displayBufferContentChart}
                onChange={onBufferContentCheckBoxChange}
              />
              <span className="slider round"></span>
            </label>
          </div>
          { displayBufferContentChart ?
            <BufferContentChart
              player={player}
            /> : null }
        </div>
      </div>
    );
  }
}

export default React.memo(ChartsManager);
