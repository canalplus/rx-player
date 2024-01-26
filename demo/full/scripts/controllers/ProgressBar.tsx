import * as React from "react";
import ProgressbarComponent from "../components/ProgressBar";
import ToolTip from "../components/ToolTip";
import VideoThumbnail from "../components/VideoThumbnail";
import useModuleState from "../lib/useModuleState";
import type { IPlayerModule } from "../modules/player/index";

function ProgressBar({
  player,
  enableVideoThumbnails,
  onSeek,
}: {
  player: IPlayerModule;
  enableVideoThumbnails: boolean;
  onSeek: () => void;
}): JSX.Element {
  const bufferGap = useModuleState(player, "bufferGap");
  const currentTime = useModuleState(player, "currentTime");
  const isContentLoaded = useModuleState(player, "isContentLoaded");
  const isLive = useModuleState(player, "isLive");
  const minimumPosition = useModuleState(player, "minimumPosition");
  const livePosition = useModuleState(player, "livePosition");
  const maximumPosition = useModuleState(player, "maximumPosition");

  const [timeIndicatorVisible, setTimeIndicatorVisible] = React.useState(false);
  const [timeIndicatorPosition, setTimeIndicatorPosition] = React.useState(0);
  const [timeIndicatorText, setTimeIndicatorText] = React.useState("");
  const [thumbnailIsVisible, setThumbnailIsVisible] = React.useState(false);
  const [tipPosition, setTipPosition] = React.useState(0);
  const [imageTime, setImageTime] = React.useState<number | null>(null);

  const wrapperElementRef = React.useRef<HTMLDivElement>(null);

  const showTimeIndicator = React.useCallback(
    (wallClockTime: number, clientX: number): void => {
      let hours;
      let minutes;
      let seconds;
      if (isLive) {
        const date = new Date(wallClockTime * 1000);
        hours = date.getHours();
        minutes = date.getMinutes();
        seconds = date.getSeconds();
      } else {
        hours = Math.floor(wallClockTime / 3600);
        minutes = Math.floor((wallClockTime - hours * 3600) / 60);
        seconds = Math.floor(wallClockTime - (minutes * 60 + hours * 3600));
      }
      const currentReadableTime =
        hours.toString().padStart(2, "0") +
        ":" +
        minutes.toString().padStart(2, "0") +
        ":" +
        seconds.toString().padStart(2, "0");

      setTimeIndicatorVisible(true);
      setTimeIndicatorPosition(clientX);
      setTimeIndicatorText(currentReadableTime);
    },
    [isLive],
  );

  const hideTimeIndicator = React.useCallback((): void => {
    setTimeIndicatorVisible(false);
    setTimeIndicatorPosition(0);
    setTimeIndicatorText("");
  }, [isLive]);

  const showVideoTumbnail = React.useCallback((ts: number, clientX: number): void => {
    const timestampToMs = ts;
    setThumbnailIsVisible(true);
    setTipPosition(clientX);
    setImageTime(timestampToMs);
  }, []);

  const showThumbnail = React.useCallback(
    (ts: number, clientX: number): void => {
      if (enableVideoThumbnails) {
        showVideoTumbnail(ts, clientX);
      }
    },
    [showVideoTumbnail, enableVideoThumbnails],
  );

  const hideTumbnail = React.useCallback((): void => {
    setThumbnailIsVisible(false);
    setTipPosition(0);
    setImageTime(null);
  }, []);

  const seek = React.useCallback(
    (position: number): void => {
      player.actions.seek(position);
      onSeek();
    },
    [player],
  );

  const hideToolTips = React.useCallback(() => {
    hideTimeIndicator();
    hideTumbnail();
  }, [hideTumbnail, hideTimeIndicator]);

  const onMouseMove = React.useCallback(
    (position: number, event: React.MouseEvent) => {
      const wallClockDiff = player.getState("wallClockDiff");
      const wallClockTime = position + (wallClockDiff ?? 0);
      showTimeIndicator(wallClockTime, event.clientX);
      showThumbnail(position, event.clientX);
    },
    [player, showTimeIndicator, showThumbnail],
  );

  const toolTipOffset =
    wrapperElementRef.current !== null
      ? wrapperElementRef.current.getBoundingClientRect().left
      : 0;

  if (!isContentLoaded) {
    return (
      <div className="progress-bar-parent" ref={wrapperElementRef}>
        <div className="progress-bar-wrapper" />
      </div>
    );
  }

  let thumbnailElement: JSX.Element | null = null;
  if (thumbnailIsVisible) {
    const xThumbnailPosition = tipPosition - toolTipOffset;
    if (enableVideoThumbnails && imageTime !== null) {
      thumbnailElement = (
        <VideoThumbnail xPosition={xThumbnailPosition} time={imageTime} player={player} />
      );
    }
  }

  return (
    <div className="progress-bar-parent" ref={wrapperElementRef}>
      {timeIndicatorVisible ? (
        <ToolTip
          className="progress-tip"
          text={timeIndicatorText}
          xPosition={timeIndicatorPosition}
          offset={toolTipOffset}
        />
      ) : null}
      {thumbnailElement}
      {currentTime === undefined ? null : (
        <ProgressbarComponent
          seek={seek}
          onMouseOut={hideToolTips}
          onMouseMove={onMouseMove}
          position={currentTime}
          minimumPosition={minimumPosition}
          maximumPosition={livePosition ?? maximumPosition}
          bufferGap={bufferGap}
        />
      )}
    </div>
  );
}

export default React.memo(ProgressBar);
