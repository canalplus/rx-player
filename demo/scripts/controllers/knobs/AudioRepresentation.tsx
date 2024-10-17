import * as React from "react";
import { IAudioRepresentation } from "rx-player/types";
import Knob from "../../components/Knob";
import useModuleState from "../../lib/useModuleState";
import type { IPlayerModule } from "../../modules/player/index";

/**
 * @param {Object} props
 * @returns {Object}
 */
function AudioRepresentationKnob({
  player,
  className,
}: {
  player: IPlayerModule;
  className?: string;
}): JSX.Element {
  const isAudioRepresentationLocked = useModuleState(
    player,
    "audioRepresentationsLocked",
  );
  const audioRepresentation = useModuleState(player, "audioRepresentation");
  const audioTrack = useModuleState(player, "audioTrack");

  const availableAudioRepresentations =
    audioTrack === null || audioTrack === undefined ? [] : audioTrack.representations;

  const [options, selectedIndex]: [string[], number] = React.useMemo(() => {
    if (!availableAudioRepresentations.length || audioRepresentation == null) {
      return [["Not available"], 0];
    }
    if (availableAudioRepresentations.length > 1) {
      let autoValue = "auto";
      if (!isAudioRepresentationLocked) {
        const info = getAudioRepresentationInfo(audioRepresentation);
        if (info.length > 0) {
          autoValue += " (" + info.join(", ") + ")";
        }
      }

      const correspondingInfo = availableAudioRepresentations.map((r) =>
        getAudioRepresentationInfo(r).join(", "),
      );

      return [
        [autoValue, ...correspondingInfo],
        isAudioRepresentationLocked
          ? availableAudioRepresentations.findIndex(
              (r) => r.id === audioRepresentation?.id,
            ) + 1 || 0
          : 0,
      ];
    }
    return [
      availableAudioRepresentations.map((r) => getAudioRepresentationInfo(r).join(", ")),
      0,
    ];
  }, [availableAudioRepresentations, isAudioRepresentationLocked, audioRepresentation]);

  const onAudioRepresentationChange = React.useCallback(
    ({ index }: { index: number }) => {
      if (index > 0) {
        const rep = availableAudioRepresentations[index - 1];
        player.actions.lockAudioRepresentations([rep]);
      } else {
        player.actions.unlockAudioRepresentations();
      }
    },
    [availableAudioRepresentations, player],
  );

  return (
    <Knob
      name="Audio quality"
      ariaLabel="Update the audio quality"
      className={className}
      disabled={availableAudioRepresentations.length < 2}
      onChange={onAudioRepresentationChange}
      options={options}
      selected={{ index: selectedIndex, value: undefined }}
    />
  );
}

export default AudioRepresentationKnob;

function getAudioRepresentationInfo(audioRepresentation: IAudioRepresentation): string[] {
  const info = [];
  if (audioRepresentation.bitrate !== undefined) {
    info.push(`${Math.round(audioRepresentation.bitrate / 1000)}kbps`);
  }
  if (info.length === 0) {
    info.push("id: " + String(audioRepresentation.id));
  }
  return info;
}
