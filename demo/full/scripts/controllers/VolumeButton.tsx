import * as React from "react";
import Button from "../components/Button";
import useModuleState from "../lib/useModuleState";
import type { IPlayerModule } from "../modules/player/index";

/**
 * Simple volume button.
 * Triggers the right callback on click.
 *
 * Needs 2 props:
 *   - {Object} player: the player module.
 *   - {string} [className]: An optional className to add to the
 *     button
 *
 * @param {Object} props
 * @returns {Object}
 */
function VolumeButton({
  className = "",
  player,
}: {
  className?: string | undefined;
  player: IPlayerModule;
}) {
  const { muted, volume } = useModuleState(player, "volumeInfo");

  let volumeLevelClass;
  let charCode;
  if (muted || volume === 0) {
    volumeLevelClass = "muted";
    charCode = 0xf026;
  } else if (volume <= 0.5) {
    volumeLevelClass = "low";
    charCode = 0xf027;
  } else {
    volumeLevelClass = "high";
    charCode = 0xf028;
  }

  const onClick = React.useCallback(() => {
    if (muted) {
      player.actions.unmute();
    } else {
      player.actions.mute();
    }

    if (volume === 0) {
      player.actions.setVolume(0.3);
    }
  }, [volume, muted]);

  return (
    <Button
      ariaLabel="Mute/Unmute audio"
      className={`volume-button ${className} ${volumeLevelClass}`}
      onClick={onClick}
      value={String.fromCharCode(charCode)}
      disabled={false}
    />
  );
}

export default React.memo(VolumeButton);
