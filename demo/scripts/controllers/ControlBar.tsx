import * as React from "react";
import Button from "../components/Button";
import PositionInfos from "../components/PositionInfos";
import LivePosition from "../components/LivePosition";
import StickToLiveEdgeButton from "../components/StickToLiveEdgeButton";
import PlayPauseButton from "./PlayPauseButton";
import FullscreenButton from "./FullScreenButton";
import ProgressBar from "./ProgressBar";
import VolumeButton from "./VolumeButton";
import VolumeBar from "./VolumeBar";
import type { IPlayerModule } from "../modules/player/index";
import useModuleState from "../lib/useModuleState";

const { useCallback, useMemo } = React;

function ControlBar({
  enableVideoThumbnails,
  player,
  stopVideo,
  toggleSettings,
  playerWrapperElementRef,
}: {
  enableVideoThumbnails: boolean;
  player: IPlayerModule;
  stopVideo: () => void;
  toggleSettings: () => void;
  playerWrapperElementRef: { current: HTMLElement | null };
}) {
  const currentTime = useModuleState(player, "currentTime");
  const duration = useModuleState(player, "duration");
  const isCatchUpEnabled = useModuleState(player, "isCatchUpEnabled");
  const isCatchingUp = useModuleState(player, "isCatchingUp");
  const isContentLoaded = useModuleState(player, "isContentLoaded");
  const isLive = useModuleState(player, "isLive");
  const isPaused = useModuleState(player, "isPaused");
  const isStopped = useModuleState(player, "isStopped");
  const liveGap = useModuleState(player, "liveGap");
  const lowLatencyMode = useModuleState(player, "lowLatencyMode");
  const livePosition = useModuleState(player, "livePosition");
  const maximumPosition = useModuleState(player, "maximumPosition");
  const playbackRate = useModuleState(player, "playbackRate");

  const changeStickToLiveEdge = useCallback(
    (shouldStick: boolean) => {
      if (shouldStick) {
        player.actions.enableLiveCatchUp();
      } else {
        player.actions.disableLiveCatchUp();
      }
    },
    [player],
  );

  let isCloseToLive = undefined;
  if (isLive && lowLatencyMode != null && liveGap != null) {
    isCloseToLive = lowLatencyMode ? liveGap < 7 : liveGap < 18;
  }

  const positionElement = useMemo(() => {
    if (!isContentLoaded) {
      return null;
    } else if (isLive) {
      return <LivePosition />;
    } else {
      return <PositionInfos position={currentTime} duration={duration} />;
    }
  }, [isContentLoaded, isLive, currentTime, duration]);

  const onSeek = useCallback(() => {
    changeStickToLiveEdge(false);
  }, [changeStickToLiveEdge]);

  const toggleSeekToLiveEdge = useCallback(() => {
    changeStickToLiveEdge(!isCatchUpEnabled);
  }, [changeStickToLiveEdge, isCatchUpEnabled]);

  const isAtLiveEdge = isLive && isCloseToLive && !isCatchingUp;

  const onLiveDotClick = React.useCallback(() => {
    const livePos = livePosition ?? maximumPosition;
    if (livePos == null) {
      /* eslint-disable-next-line no-console */
      console.error("Cannot go back to live: live position not found");
      return;
    }
    if (!isAtLiveEdge) {
      player.actions.seek(livePos - (lowLatencyMode ? 4 : 10));
    }
  }, [isAtLiveEdge, player, livePosition, maximumPosition, lowLatencyMode]);

  return (
    <div className="controls-bar-container">
      <ProgressBar
        player={player}
        enableVideoThumbnails={enableVideoThumbnails}
        onSeek={onSeek}
      />
      <div className="controls-bar">
        <PlayPauseButton className={"control-button"} player={player} />
        <Button
          className={"control-button"}
          ariaLabel="Stop playback"
          onClick={stopVideo}
          value={String.fromCharCode(0xf04d)}
          disabled={isStopped}
        />
        {isContentLoaded && isLive && lowLatencyMode ? (
          <StickToLiveEdgeButton
            isStickingToTheLiveEdge={isCatchUpEnabled}
            changeStickToLiveEdge={toggleSeekToLiveEdge}
          />
        ) : null}
        {positionElement}
        {isLive && isContentLoaded ? (
          <Button
            ariaLabel={isAtLiveEdge ? "We're playing live" : "Go back to live"}
            className={"dot" + (isAtLiveEdge ? " live" : "")}
            onClick={onLiveDotClick}
            disabled={!!isAtLiveEdge}
            value=""
          />
        ) : null}
        <div className="controls-right-side">
          {!isPaused && isCatchingUp && playbackRate > 1 ? (
            <div className="catch-up">
              {"Catch-up playback rate: " + String(playbackRate)}
            </div>
          ) : null}
          <Button
            ariaLabel="Display/Hide controls"
            disabled={!isContentLoaded}
            className="control-button"
            onClick={toggleSettings}
            value={String.fromCharCode(0xf013)}
          />
          <div className="volume">
            <VolumeButton className="control-button" player={player} />
            <VolumeBar player={player} />
          </div>
          <FullscreenButton
            className={"control-button"}
            player={player}
            playerWrapperElementRef={playerWrapperElementRef}
          />
        </div>
      </div>
    </div>
  );
}

export default React.memo(ControlBar);
