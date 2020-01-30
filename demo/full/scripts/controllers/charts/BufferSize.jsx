import React from "react";
import Chart from "chart.js";

const repeat = (str, time) => {
  const ret = [];
  for (let i = time; i > 0; i--) {
    ret.push(str);
  }
  return ret;
};

const filterData = (data, duration) => {
  const { length } = data;
  const until = Date.now() - duration;
  for (let i = length; i > 0; i--) {
    if (data[i - 1].date < until) {
      return data.slice(i, length);
    }
  }
  return data;
};

class BufferSizeChart extends React.Component {
  constructor(...args) {
    super(...args);
    this.state = {
      duration: 60000,
    };
  }

  componentDidMount() {
    const { element } = this;
    if (!element) {
      return;
    }

    const { module } = this.props;
    const { duration } = this.state;

    const initialData = filterData(module.get().data || [], duration);

    const canvas = element;
    const ctx = canvas.getContext("2d");

    const startingData = {
      labels: repeat("", initialData.length),
      datasets: [
        {
          label: "Buffer Size, in s",
          backgroundColor: "rgba(200, 100, 200, 0.2)",
          fill: true,
          data: initialData.map(({ value }) => value),
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
        scales: {
          xAxes: [{
            gridLines: {
              display: false,
            },
          }],
        },
      },
    });


    this.subscription = module.$get("data")
      .subscribe(data => this.onNewData(data));
  }

  onNewData(data) {
    const { duration } = this.state;
    const [ oldDataset ] = this.chart.data.datasets;
    const newData = filterData(data, duration)
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

export default React.memo(BufferSizeChart);
