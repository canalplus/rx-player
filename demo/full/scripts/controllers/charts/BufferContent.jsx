import React from "react";
import withModulesState from "../../lib/withModulesState.jsx";
import BufferContentGraph from "../../components/BufferContentGraph.jsx";

function BufferContentChart({
  player,
  bufferedData,
  currentTime,
  maximumPosition,
  minimumPosition,
}) {
  if (bufferedData === null || Object.keys(bufferedData).length === 0) {
    return (<div className="buffer-content-no-content"> No content yet </div>);
  }
  const seek = position => {
    player.dispatch("SEEK", position);
  };
  const subCharts = Object.keys(bufferedData)
    .filter(type => bufferedData[type] !== null)
    .map(type => {
      return (
        <BufferContentGraph
          key={type}
          type={type}
          currentTime={currentTime}
          minimumPosition={minimumPosition}
          maximumPosition={maximumPosition}
          data={bufferedData[type]}
          seek={seek}
        />
      );
    });
  if (subCharts.length === 0) {
    return (<div className="buffer-content-no-content"> No content yet </div>);
  }
  return (
    <div className="buffer-content-graphs-parent">
      {subCharts}
    </div>
  );
}

export default React.memo(withModulesState({
  player: { bufferedData: "bufferedData",
            currentTime: "currentTime",
            minimumPosition: "minimumPosition",
            maximumPosition: "maximumPosition" },
})(BufferContentChart));
