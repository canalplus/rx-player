import React, {
  useEffect,
  useState,
} from "react";
import { createModule } from "../../lib/vespertine.js";
import ChartDataModule from "../../modules/ChartData.js";
import BufferContentChart from "./BufferContent.jsx";
import BufferSizeChart from "./BufferSize.jsx";

const BUFFER_GAP_REFRESH_TIME = 500;
const MAX_BUFFER_SIZE_LENGTH = 2000;

function ChartsManager({ player }) {
  const [displayBufferContentChart,
         updateDisplayBufferContentChart] = useState(false);
  const [displayBufferSizeChart,
         updateDisplayBufferSizeChart] = useState(false);
  const [bufferSizeChart,
         updateBufferSizeChart] = useState(null);

  useEffect(() => {
    if (!player) {
      return;
    }
    const newChartModule = createModule(ChartDataModule,
                                        { maxSize: MAX_BUFFER_SIZE_LENGTH });
    newChartModule.dispatch("ADD_DATA", player.get("bufferGap"));
    const interval = setInterval(() => {
      newChartModule.dispatch("ADD_DATA", player.get("bufferGap"));
    }, BUFFER_GAP_REFRESH_TIME);
    updateBufferSizeChart(newChartModule);

    return () => {
      clearInterval(interval);
      newChartModule.destroy();
      updateBufferSizeChart(null);
    };
  }, [player]);

  const onBufferContentCheckBoxChange = (e) => {
    const target = e.target;
    const value = target.type === "checkbox" ?
      target.checked : target.value;
    updateDisplayBufferContentChart(value);
  };
  const onBufferSizeCheckBoxChange = (e) => {
    const target = e.target;
    const value = target.type === "checkbox" ?
      target.checked : target.value;
    updateDisplayBufferSizeChart(value);
  };

  return (
    <div className="player-charts">
      <div className="player-box">
        <div className="chart-checkbox">
          Buffer content chart
          <label className="switch">
            <input
              name="displayBufferContentChart"
              type="checkbox"
              aria-label="Display/Hide chart about the buffer's content"
              checked={displayBufferContentChart}
              onChange={onBufferContentCheckBoxChange}
            />
            <span className="slider round"></span>
          </label>
        </div>
        { displayBufferContentChart && player ?
          <BufferContentChart
            player={player}
          /> : null }
      </div>
      <div className="player-box">
        <div className="chart-checkbox" >
          Buffer size chart
          <label className="switch">
            <input
              aria-label="Display/Hide chart about the buffer's size"
              name="displayBufferSizeChart"
              type="checkbox"
              checked={displayBufferSizeChart}
              onChange={onBufferSizeCheckBoxChange}
            />
            <span className="slider round"></span>
          </label>
        </div>
        { displayBufferSizeChart && bufferSizeChart !== null ?
          <BufferSizeChart
            module={bufferSizeChart}
          /> : null }
      </div>
    </div>
  );
}

export default React.memo(ChartsManager);
