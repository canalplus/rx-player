import React from "react";
import { createModule } from "../../lib/vespertine.js";
import ChartDataModule from "../../modules/ChartData.js";
import BufferContentChart from "./BufferContent.jsx";
import BufferSizeChart from "./BufferSize.jsx";

const BUFFER_GAP_REFRESH_TIME = 500;
const MAX_BUFFER_SIZE_LENGTH = 2000;

class ChartsManager extends React.Component {
  constructor(...args) {
    super(...args);
    this.state = { displayBufferContentChart: false,
                   displayBufferSizeChart: false };
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
    const { displayBufferSizeChart,
            displayBufferContentChart } = this.state;
    const { player } = this.props;

    const onBufferContentCheckBoxChange = (e) => {
      const target = e.target;
      const value = target.type === "checkbox" ?
        target.checked : target.value;
      this.setState({ displayBufferContentChart: value });
    };
    const onBufferSizeCheckBoxChange = (e) => {
      const target = e.target;
      const value = target.type === "checkbox" ?
        target.checked : target.value;

      this.setState({ displayBufferSizeChart: value });
    };
    return (
      <div className="player-charts">
        <div className="player-box">
          <div className="chart-checkbox" >
            Buffer content chart
            <label class="switch">
              <input
                name="displayBufferContentChart"
                type="checkbox"
                aria-label="Display/Hide chart about the buffer's content"
                checked={this.state.displayBufferContentChart}
                onChange={onBufferContentCheckBoxChange}
              />
              <span class="slider round"></span>
            </label>
          </div>
          { displayBufferContentChart ?
            <BufferContentChart
              player={player}
            /> : null }
        </div>
        <div className="player-box">
          <div className="chart-checkbox" >
            Buffer size chart
            <label class="switch">
              <input
                aria-label="Display/Hide chart about the buffer's size"
                name="displayBufferSizeChart"
                type="checkbox"
                checked={this.state.displayBufferSizeChart}
                onChange={onBufferSizeCheckBoxChange}
              />
              <span class="slider round"></span>
            </label>
          </div>
          { displayBufferSizeChart ?
            <BufferSizeChart
              module={this.bufferSizeChart}
            /> : null }
        </div>
      </div>
    );
  }
}

export default React.memo(ChartsManager);
