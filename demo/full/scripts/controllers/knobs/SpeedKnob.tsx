import * as React from "react";
import Knob from "../../components/Knob";
import useModuleState from "../../lib/useModuleState";
import type { IPlayerModule } from "../../modules/player/index";

const AVAILABLE_RATES = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.5, 3];
const ALIASES: Partial<Record<number, string>> = { 1: "Normal" };
const OPTIONS = AVAILABLE_RATES.map((rate) => {
  return ALIASES[rate] ?? String(rate);
});

/**
 * Input for playback rate selection on a media content.
 * @param {Object} props
 * @returns {Object}
 */
function SpeedKnob({
  player,
  className,
}: {
  player: IPlayerModule;
  className?: string;
}): JSX.Element {
  const playbackRate = useModuleState(player, "playbackRate");
  let selectedIndex = AVAILABLE_RATES.findIndex((rate) => playbackRate === rate);

  const onPlaybackRateChange = React.useCallback(
    ({ index }: { index: number }) => {
      if (index > -1) {
        selectedIndex = index;
        const rate = AVAILABLE_RATES[index];
        if (rate !== undefined) {
          player.actions.setPlaybackRate(rate);
        } else {
          /* eslint-disable-next-line no-console */
          console.error("Error: playback rate not found");
        }
      }
    },
    [player],
  );

  return (
    <Knob
      className={className}
      ariaLabel="Update the current playback speed"
      name="Playback Rate"
      disabled={OPTIONS.length < 2}
      onChange={onPlaybackRateChange}
      options={OPTIONS}
      selected={{ index: selectedIndex, value: undefined }}
    />
  );
}

export default React.memo(SpeedKnob);
