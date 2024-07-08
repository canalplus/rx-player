import * as React from "react";
import translateAudioTrackCode from "../../lib/translateLanguageCode";
import Knob from "../../components/Knob";
import useModuleState from "../../lib/useModuleState";
import type { IPlayerModule } from "../../modules/player/index";
import type { IAudioTrack, IAvailableAudioTrack } from "../../../../../src/public_types";

const AUDIO_DESCRIPTION_ICON = "(AD)"; // String.fromCharCode(0xf29e);

function findAudioTrackIndex(
  audioTrack: IAudioTrack,
  audioTracks: IAvailableAudioTrack[],
) {
  return audioTracks.findIndex((ln) => ln.id === audioTrack.id);
}

/**
 * Input for audio track selection of a media content.
 * @param {Object} props
 * @returns {Object}
 */
function AudioTrackKnob({
  player,
  className,
}: {
  player: IPlayerModule;
  className?: string | undefined;
}): JSX.Element {
  const currentAudioTrack = useModuleState(player, "audioTrack");
  const availableAudioTracks = useModuleState(player, "availableAudioTracks");

  const [options, selectedIndex]: [string[], number] = React.useMemo(() => {
    if (availableAudioTracks.length === 0) {
      return [["Not available"], 0];
    }
    return [
      availableAudioTracks.map((audioTrack) => {
        return (
          translateAudioTrackCode(audioTrack.normalized) +
          (audioTrack.audioDescription ? " " + AUDIO_DESCRIPTION_ICON : "")
        );
      }),

      currentAudioTrack
        ? Math.max(findAudioTrackIndex(currentAudioTrack, availableAudioTracks), 0)
        : 0,
    ];
  }, [availableAudioTracks, currentAudioTrack]);

  const onAudioTrackChange = React.useCallback(
    ({ index }: { index: number }) => {
      const track = availableAudioTracks[index];
      if (track !== undefined) {
        player.actions.setAudioTrack(track);
      } else {
        /* eslint-disable-next-line no-console */
        console.error("Error: audio track not found");
      }
    },
    [availableAudioTracks, player],
  );

  return (
    <Knob
      name="Audio AudioTrack"
      ariaLabel="Update the audio track"
      className={className}
      disabled={availableAudioTracks.length < 2}
      onChange={onAudioTrackChange}
      options={options}
      selected={{ index: selectedIndex, value: undefined }}
    />
  );
}

export default React.memo(AudioTrackKnob);
