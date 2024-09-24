import * as React from "react";
import translateLanguageCode from "../../lib/translateLanguageCode";
import Knob from "../../components/Knob";
import useModuleState from "../../lib/useModuleState";
import type { IPlayerModule } from "../../modules/player/index";
import type { IAudioTrack, IAvailableAudioTrack } from "../../../../../src/public_types";

const AUDIO_DESCRIPTION_ICON = "(AD)"; // String.fromCharCode(0xf29e);

function findLanguageIndex(language: IAudioTrack, languages: IAvailableAudioTrack[]) {
  return languages.findIndex((ln) => ln.id === language.id);
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
  const currentLanguage = useModuleState(player, "language");
  const availableLanguages = useModuleState(player, "availableLanguages");

  const [options, selectedIndex]: [string[], number] = React.useMemo(() => {
    if (availableLanguages.length === 0) {
      return [["Not available"], 0];
    }
    return [
      availableLanguages.map((language) => {
        return (
          translateLanguageCode(language.normalized) +
          (language.audioDescription ? " " + AUDIO_DESCRIPTION_ICON : "")
        );
      }),

      currentLanguage
        ? Math.max(findLanguageIndex(currentLanguage, availableLanguages), 0)
        : 0,
    ];
  }, [availableLanguages, currentLanguage]);

  const onLanguageChange = React.useCallback(
    ({ index }: { index: number }) => {
      const track = availableLanguages[index];
      if (track !== undefined) {
        player.actions.setAudioTrack(track);
      } else {
        /* eslint-disable-next-line no-console */
        console.error("Error: audio track not found");
      }
    },
    [availableLanguages, player],
  );

  return (
    <Knob
      name="Audio Language"
      ariaLabel="Update the audio track"
      className={className}
      disabled={availableLanguages.length < 2}
      onChange={onLanguageChange}
      options={options}
      selected={{ index: selectedIndex, value: undefined }}
    />
  );
}

export default React.memo(AudioTrackKnob);
