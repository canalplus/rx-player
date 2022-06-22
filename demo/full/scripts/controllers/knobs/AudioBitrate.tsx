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
  player: IPlayerModule
  className?: string;
}): JSX.Element {
  const audioBitrateAuto = useModuleState(player, "audioBitrateAuto");
  const audioRepresentation = useModuleState(player, "audioRepresentation");
  const audioTrack = useModuleState(player, "audioTrack");

  const availableAudioBitrates =
    audioTrack === null || audioTrack === undefined ?
      [] :
      audioTrack.representations
        .map(r => r.bitrate)
        .filter(b => b !== undefined);
  const [options, selectedIndex]: [string[], number] = React.useMemo(() => {
    if (!availableAudioBitrates.length) {
      return [["Not available"], 0];
    }
    if (availableAudioBitrates.length > 1) {
      const autoValue =
        audioBitrateAuto &&
        typeof audioRepresentation?.bitrate === "number" ?
          `auto (${audioRepresentation.bitrate})` :
          "auto";
      return [
        [autoValue, ...availableAudioBitrates.map(String)],
        audioBitrateAuto || audioRepresentation?.bitrate === undefined ?
          0 : (
            availableAudioBitrates.indexOf(audioRepresentation.bitrate) + 1 || 0
          )
      ];
    }
    return [availableAudioBitrates.map(String), 0];
  }, [availableAudioBitrates, audioBitrateAuto, audioRepresentation]);

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
    [availableAudioBitrates, player]
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
