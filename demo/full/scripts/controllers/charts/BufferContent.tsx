import * as React from "react";
import BufferContentGraph from "../../components/BufferContentGraph";
import useModuleState from "../../lib/useModuleState";
import type { IBufferedData, IPlayerModule } from "../../modules/player/index";

export default function BufferContentChart({ player }: { player: IPlayerModule }) {
  const bufferedData = useModuleState(player, "bufferedData");
  const currentTime = useModuleState(player, "currentTime");
  const maximumPosition = useModuleState(player, "maximumPosition");
  const minimumPosition = useModuleState(player, "minimumPosition");

  const seek = React.useCallback(
    (position: number): void => {
      player.actions.seek(position);
    },
    [player],
  );

  if (bufferedData === null || Object.keys(bufferedData).length === 0) {
    return <div className="buffer-content-no-content"> No content yet </div>;
  }

  const subCharts = (Object.keys(bufferedData) as Array<"audio" | "video" | "text">)
    .filter((type: "audio" | "video" | "text") => {
      return bufferedData[type] !== null;
    })
    .map((type) => {
      return (
        <BufferContentGraph
          key={type}
          type={type}
          currentTime={currentTime}
          minimumPosition={minimumPosition}
          maximumPosition={maximumPosition}
          data={bufferedData[type] as IBufferedData[]}
          seek={seek}
        />
      );
    });
  if (subCharts.length === 0) {
    return <div className="buffer-content-no-content"> No content yet </div>;
  }
  return <div className="buffer-content-graphs-parent">{subCharts}</div>;
}
