import * as React from "react";
import Button from "../components/Button";
import useModuleState from "../lib/useModuleState";
import type { IPlayerModule } from "../modules/player/index";

/**
 * Play/Pause button.
 * Triggers the right callback on click.
 * @param {Object} props
 * @returns {Object}
 */
function PlayPauseButton({
  className = "",
  player,
}: {
  className?: string | undefined;
  player: IPlayerModule;
}): React.JSX.Element {
  const cannotLoadMetadata = useModuleState(player, "cannotLoadMetadata");
  const isPaused = useModuleState(player, "isPaused");
  const isContentLoaded = useModuleState(player, "isContentLoaded");
  const hasEnded = useModuleState(player, "hasEnded");

  const disabled = !isContentLoaded && !cannotLoadMetadata;
  const displayPause = !isPaused && isContentLoaded && !hasEnded;

  const completeClassName =
    "play-pause-button " + className + (disabled ? " disabled" : "");

  const play = React.useCallback(() => {
    player.actions.play();
  }, [player]);
  const pause = React.useCallback(() => {
    player.actions.disableLiveCatchUp();
    player.actions.pause();
  }, [player]);

  return (
    <Button
      ariaLabel="Pause/Resume the content"
      className={completeClassName}
      disabled={disabled}
      onClick={displayPause ? pause : play}
      value={String.fromCharCode(displayPause ? 0xf04c : 0xf04b)}
    />
  );
}

export default React.memo(PlayPauseButton);
