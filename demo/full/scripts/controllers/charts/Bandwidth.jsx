import React from "react";
import Chart from "chart.js";

const repeat = (str, time) => {
  const ret = [];
  for (let i = time; i > 0; i--) {
    ret.push(str);
  }
  return ret;
};

const filterData = (data, size) => {
  return size < data.length ?
    data.slice(data.length - size - 1, data.length) : data;
};

class Bandwidth extends React.Component {
  constructor(...args) {
    super(...args);
    this.state = {
      size: 30,
    };
  }

  componentDidMount() {
    const { element } = this;
    if (!element) {
      return;
    }

    const { module } = this.props;
    const { size } = this.state;

    const initialData = filterData(module.get("data"), size);

    const canvas = element;
    const ctx = canvas.getContext("2d");

    const startingData = {
      labels: repeat("", initialData.length),
      datasets: [
        {
          label: "Last calculated Bandwidth, in kBps" +
          " (might be false when cache is involved)",
          backgroundColor: "rgba(100, 200, 200, 0.2)",
          fill: true,
          data: initialData.map(({ value }) => value),
          steppedLine: true,
        },
      ],
    };

    this.chart = new Chart(ctx, {
      type: "line",
      data: startingData,
      options: {
        // deactive animation as it f**cks all up when updating
        // TODO change chart lib or do it manually
        animation: false,
        elements: {
          point:{
            radius: 0,
          },
        },
      },
    });


    this.subscription = module.$get("data")
      .subscribe(data => this.onNewData(data));
  }

  onNewData(data) {
    const { size } = this.state;
    const [ oldDataset ] = this.chart.data.datasets;
    const newData = filterData(data, size)
      .map(({ value }) => value);

    this.chart.data.datasets[0] = Object.assign({}, oldDataset, {
      data: newData,
    });
    this.chart.data.labels = repeat("", newData.length);
    this.chart.update();
  }

  componentWillUnmount() {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  render() {
    return (
      <div>
        <canvas
          className="bitrate-charts"
          height="80"
          ref={(el) => this.element = el}
        />
      </div>
    );
  }
}

export default Bandwidth;
