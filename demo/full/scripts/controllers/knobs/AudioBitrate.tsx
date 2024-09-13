import * as React from "react";
import Knob from "../../components/Knob";
import useModuleState from "../../lib/useModuleState";
import type { IPlayerModule } from "../../modules/player/index";

/**
 * Input for audio bitrate selection of a media content.
 * @param {Object} props
 * @returns {Object}
 */
function AudioBitrateKnob({
  player,
  className,
}: {
  player: IPlayerModule;
  className?: string;
}): JSX.Element {
  const audioBitrateAuto = useModuleState(player, "audioBitrateAuto");
  const audioBitrate = useModuleState(player, "audioBitrate");
  const availableAudioBitrates = useModuleState(player, "availableAudioBitrates");

  const [options, selectedIndex]: [string[], number] = React.useMemo(() => {
    if (!availableAudioBitrates.length) {
      return [["Not available"], 0];
    }
    if (availableAudioBitrates.length > 1) {
      const autoValue = audioBitrateAuto ? `auto (${audioBitrate ?? "unknown"})` : "auto";
      return [
        [autoValue, ...availableAudioBitrates.map(String)],
        audioBitrateAuto || audioBitrate === undefined
          ? 0
          : availableAudioBitrates.indexOf(audioBitrate) + 1 || 0,
      ];
    }
    return [availableAudioBitrates.map(String), 0];
  }, [availableAudioBitrates, audioBitrateAuto, audioBitrate]);

  const onAudioBitrateChange = React.useCallback(
    ({ index }: { index: number }) => {
      if (index > 0) {
        const bitrate = availableAudioBitrates[index - 1];
        player.actions.setAudioBitrate(bitrate);
      } else if (index === 0) {
        player.actions.setAudioBitrate(-1);
      } else {
        /* eslint-disable-next-line no-console */
        console.error("Error: audio bitrate not found");
      }
    },
    [availableAudioBitrates, player],
  );

  return (
    <Knob
      name="Audio Bitrate"
      ariaLabel="Update the audio bitrate"
      className={className}
      disabled={options.length < 2}
      onChange={onAudioBitrateChange}
      options={options}
      selected={{ index: selectedIndex, value: undefined }}
    />
  );
}

export default React.memo(AudioBitrateKnob);
