import React from "react";
import translateLanguageCode from "../../lib/translateLanguageCode.js";
import withModulesState from "../../lib/withModulesState.jsx";
import Knob from "../../components/Knob.jsx";

const CLOSED_CAPTION_ICON = "(CC)"; // String.fromCharCode(0xf2a4);

const findLanguageIndex = (currentSubtitle, languages) => {
  return languages.findIndex(ln => ln.id === currentSubtitle.id);
};

const SubtitlesKnobBase = ({
  player,
  className,
  currentSubtitle,
  availableSubtitles = [],
}) => {
  const options = [
    "no subtitles",
    ...availableSubtitles
      .map(subtitle => {
        return translateLanguageCode(subtitle.normalized) +
          (subtitle.closedCaption ?
            (" " + CLOSED_CAPTION_ICON) : "");
      }),
  ];

  const currentLanguageIndex = currentSubtitle ?
    findLanguageIndex(currentSubtitle, availableSubtitles) + 1
    : 0;

  const onLanguageChange = ({ index }) => {
    if (index > 0) {
      const sub = availableSubtitles[index - 1];
      player.dispatch("SET_SUBTITLES_TRACK", sub);
    } else {
      player.dispatch("DISABLE_SUBTITLES_TRACK");
    }
  };

  return (
    <Knob
      name="Subtitles Track"
      ariaLabel="Update the current subtitles"
      className={className}
      disabled={options.length <= 1}
      onChange={onLanguageChange}
      options={options}
      selected={{ index: currentLanguageIndex }}
    />
  );
};

export default React.memo(withModulesState({
  player: {
    subtitle: "currentSubtitle",
    availableSubtitles: "availableSubtitles",
  },
})(SubtitlesKnobBase));
