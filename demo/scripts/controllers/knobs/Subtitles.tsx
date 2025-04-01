import * as React from "react";
import type { ITextTrack, IAvailableTextTrack } from "../../../../src/public_types";
import translateLanguageCode from "../../lib/translateLanguageCode";
import Knob from "../../components/Knob";
import useModuleState from "../../lib/useModuleState";
import type { IPlayerModule } from "../../modules/player/index";

const CLOSED_CAPTION_ICON = "(CC)"; // String.fromCharCode(0xf2a4);

function findSubtitlesIndex(language: ITextTrack, languages: IAvailableTextTrack[]) {
  return languages.findIndex((ln) => ln.id === language.id);
}

/**
 * Input for subtitles track selection of a media content.
 * @param {Object} props
 * @returns {Object}
 */
function SubtitlesKnob({
  player,
  className,
}: {
  player: IPlayerModule;
  className?: string | undefined;
}): React.JSX.Element {
  const currentSubtitle = useModuleState(player, "subtitle");
  const availableSubtitles = useModuleState(player, "availableSubtitles");

  const options = React.useMemo(() => {
    return [
      "no subtitles",
      ...availableSubtitles.map((subtitle) => {
        return (
          translateLanguageCode(subtitle.normalized) +
          (subtitle.closedCaption ? " " + CLOSED_CAPTION_ICON : "")
        );
      }),
    ];
  }, [availableSubtitles]);

  const currentLanguageIndex = currentSubtitle
    ? findSubtitlesIndex(currentSubtitle, availableSubtitles) + 1
    : 0;

  const onSubtitlesChange = React.useCallback(
    ({ index }: { index: number }) => {
      if (index > 0) {
        const track = availableSubtitles[index - 1];
        if (track !== undefined) {
          player.actions.setTextTrack(track);
        } else {
          // eslint-disable-next-line no-console
          console.error("Error: subtitles track not found");
        }
      } else {
        player.actions.disableSubtitlesTrack();
      }
    },
    [availableSubtitles, player],
  );

  return (
    <Knob
      name="Subtitles Track"
      ariaLabel="Update the current subtitles"
      className={className}
      disabled={options.length <= 1}
      onChange={onSubtitlesChange}
      options={options}
      selected={{ index: currentLanguageIndex, value: undefined }}
    />
  );
}

export default React.memo(SubtitlesKnob);
