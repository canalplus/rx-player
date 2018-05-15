import React from "react";
import translateLanguageCode from "../../lib/translateLanguageCode.js";
import withModulesState from "../../lib/withModulesState.jsx";
import Knob from "../../components/Knob.jsx";

const AUDIO_DESCRIPTION_ICON = "(AD)"; // String.fromCharCode(0xf29e);

const findLanguageIndex = (language, languages) => {
  return languages.findIndex(ln => ln.id === language.id);
};

const AudioTrackKnobBase = ({
  player,
  currentLanguage,
  availableLanguages = [],
}) => {
  let options = [];
  let selectedIndex;

  if (!availableLanguages.length) {
    options = ["Not available"];
    selectedIndex = 0;
  } else {
    options = availableLanguages
      .map(language => {
        return translateLanguageCode(language.normalized) +
          (language.audioDescription ?
            (" " + AUDIO_DESCRIPTION_ICON) : "");
      });

    selectedIndex = currentLanguage ?
      Math.max(findLanguageIndex(currentLanguage, availableLanguages), 0)
      : 0;
  }

  const onLanguageChange = (evt) => {
    const index = +evt.target.value;
    const track = availableLanguages[index];
    player.dispatch("SET_AUDIO_TRACK", track);
  };

  return (
    <Knob
      name="Audio Language"
      disabled={availableLanguages.length < 2}
      onChange={onLanguageChange}
      options={options}
      selected={selectedIndex}
    />
  );
};

export default withModulesState({
  player: {
    language: "currentLanguage",
    availableLanguages: "availableLanguages",
  },
})(AudioTrackKnobBase);
