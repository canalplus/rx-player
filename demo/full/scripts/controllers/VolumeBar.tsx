import * as React from "react";
import useModuleState from "../lib/useModuleState";
import type { IPlayerModule } from "../modules/player/index";

/**
 * Horizontal (left-to-right) volume indication component which:
 *
 *   - represents the current volume relatively to the max and min.
 *
 *   - triggers a setVolume function with the clicked volume percentage on click
 * @param {Object} props
 * @returns {Object}
 */
function VolumeBar({
  player, // current volume percentage
}: {
  player: IPlayerModule;
}): JSX.Element {
  const { volume, muted } = useModuleState(player, "volumeInfo");
  const elementRef = React.useRef<HTMLDivElement>(null);

  const getMouseVolume = React.useCallback((event: React.MouseEvent) => {
    if (elementRef.current === null) {
      return;
    }
    const rect = elementRef.current.getBoundingClientRect();
    const point0 = rect.left;
    const clickPosPx = Math.max(event.clientX - point0, 0);
    const endPointPx = Math.max(rect.right - point0, 0);
    if (!endPointPx) {
      return 0;
    }
    return Math.min(clickPosPx / endPointPx, 1);
  }, []);

  const onVolumeClick = React.useCallback(
    (evt: React.MouseEvent) => {
      const newVol = getMouseVolume(evt);
      if (newVol !== undefined) {
        if (newVol === 0) {
          player.actions.mute();
        } else {
          player.actions.setVolume(newVol);
          player.actions.unmute();
        }
      }
    },
    [player],
  );

  return (
    <div className="volume-bar-wrapper" ref={elementRef} onClick={onVolumeClick}>
      <div
        className="volume-bar-current"
        style={{ width: muted ? "0%" : `${volume * 100}%` }}
      />
    </div>
  );
}

export default React.memo(VolumeBar);
