import * as React from "react";
import ChartDataModule, { IChartModule } from "../../modules/ChartData";
import { IPlayerModule } from "../../modules/player/index";
import BufferContentChart from "./BufferContent";
import BufferSizeChart from "./BufferSize";

const { useEffect, useState } = React;

const BUFFER_GAP_REFRESH_TIME = 500;
const MAX_BUFFER_SIZE_LENGTH = 2000;

function ChartsManager({ player }: { player: IPlayerModule | null }) {
  const [displayBufferContentChart, setDisplayBufferContentChart] = useState(false);
  const [displayBufferSizeChart, setDisplayBufferSizeChart] = useState(false);
  const [bufferSizeChart, setBufferSizeChart] = useState<IChartModule | null>(null);

  useEffect(() => {
    if (!player) {
      return;
    }
    const newChartModule = new ChartDataModule(MAX_BUFFER_SIZE_LENGTH);
    newChartModule.actions.addData(player.getState("bufferGap"));
    const interval = setInterval(() => {
      newChartModule.actions.addData(player.getState("bufferGap"));
    }, BUFFER_GAP_REFRESH_TIME);
    setBufferSizeChart(newChartModule);

    return () => {
      clearInterval(interval);
      newChartModule.destroy();
      setBufferSizeChart(null);
    };
  }, [player]);

  const onBufferContentCheckBoxChange = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const target = e.target;
      const value = target.type === "checkbox" ? target.checked : target.value;
      setDisplayBufferContentChart(!!value);
    },
    [],
  );
  const onBufferSizeCheckBoxChange = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const target = e.target;
      const value = target.type === "checkbox" ? target.checked : target.value;
      setDisplayBufferSizeChart(!!value);
    },
    [],
  );

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
        {displayBufferContentChart && player ? (
          <BufferContentChart player={player} />
        ) : null}
      </div>
      <div className="player-box">
        <div className="chart-checkbox">
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
        {displayBufferSizeChart && bufferSizeChart !== null ? (
          <BufferSizeChart module={bufferSizeChart} />
        ) : null}
      </div>
    </div>
  );
}

export default React.memo(ChartsManager);
