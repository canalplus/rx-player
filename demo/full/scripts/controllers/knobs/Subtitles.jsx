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

  const onLanguageChange = (evt) => {
    const index = +evt.target.value;
    if (index > 0) {
      const sub = availableSubtitles[index - 1];
      player.dispatch("SET_SUBTITLES_TRACK", sub);
    } else {
      player.dispatch("DISABLE_SUBTITLES_TRACK");
    }
  };

  return (
    <Knob
      name="Subtitles"
      disabled={!availableSubtitles.length}
      onChange={onLanguageChange}
      options={options}
      selected={currentLanguageIndex}
    />
  );
};

export default withModulesState({
  player: {
    subtitle: "currentSubtitle",
    availableSubtitles: "availableSubtitles",
  },
})(SubtitlesKnobBase);
