import React from "react";
import { createModule } from "../../lib/vespertine.js";
import ChartDataModule from "../../modules/ChartData.js";
import BufferSizeChart from "./BufferSize.jsx";
import BandwidthChart from "./Bandwidth.jsx";

const BUFFER_GAP_REFRESH_TIME = 500;
const MAX_BUFFER_SIZE_LENGTH = 2000;
const MAX_BANDWIDTH_LENGTH = 200;

class ChartsManager extends React.Component {
  constructor(...args) {
    super(...args);
    this.state = {
      displayBufferSizeChart: false,
      displayBandwidthChart: false,
    };
    const { player } = this.props;

    this.bufferSizeChart = createModule(ChartDataModule, {
      maxSize: MAX_BUFFER_SIZE_LENGTH,
    });

    this.bandwidthChart = createModule(ChartDataModule, {
      maxSize: MAX_BANDWIDTH_LENGTH,
    });

    this.bandwidthSubscription = player.$get("bandwidth")
      .subscribe(bandwidth => {
        this.bandwidthChart.dispatch("ADD_DATA", bandwidth / 0.008);
      });

    this.bufferGapInterval = setInterval(() => {
      this.bufferSizeChart.dispatch("ADD_DATA", player.get("bufferGap"));
    }, BUFFER_GAP_REFRESH_TIME);
  }

  componentWillUnmount() {
    if (this.bufferGapInterval) {
      clearInterval(this.bufferGapInterval);
    }
    this.bufferSizeChart.destroy();
    this.bandwidthSubscription.unsubscribe();
  }

  render() {
    const { displayBandwidthChart, displayBufferSizeChart } = this.state;

    // const onBandwidthCheckBoxChange = (e) => {
    //   const target = e.target;
    //   const value = target.type === "checkbox" ?
    //     target.checked : target.value;

    //   this.setState({
    //     displayBandwidthChart: value,
    //   });
    // };

    const onBufferSizeCheckBoxChange = (e) => {
      const target = e.target;
      const value = target.type === "checkbox" ?
        target.checked : target.value;

      this.setState({
        displayBufferSizeChart: value,
      });
    };
    return (
      <div className="player-charts">
        <div className="chart-checkboxes">
          <div className="chart-checkbox" >
            Buffer size chart
            <input
              name="displayBufferSizeChart"
              type="checkbox"
              checked={this.state.displayBufferSizeChart}
              onChange={onBufferSizeCheckBoxChange} />
          </div>
          {
            // <div className="chart-checkbox" >
            //   Bandwidth chart
            //   <input
            //     name="displayBandwidthChart"
            //     type="checkbox"
            //     checked={this.state.displayBandwidthChart}
            //     onChange={onBandwidthCheckBoxChange} />
            // </div>
          }
        </div>

        { displayBufferSizeChart ?
          <BufferSizeChart
            module={this.bufferSizeChart}
          /> : null }

        { displayBandwidthChart ?
          <BandwidthChart
            module={this.bandwidthChart}
          /> : null }
      </div>
    );
  }
}

export default ChartsManager;
