const React = require("react");
const withModulesState = require("../../lib/withModulesState.jsx");
const Knob = require("../../components/Knob.jsx");

// const AUDIO_DESCRIPTION_ICON = "(AD)"; // String.fromCharCode(0xf29e);
const LANG_CODE_TO_LANG = {
  eng: "english",
  fre: "french",
  und: "unknown",
};

const translateLanguage = langCode => {
  if (!langCode) {
    return "unknown";
  }
  return LANG_CODE_TO_LANG[langCode] || langCode;
};

const findLanguageIndex = (language, languages) => {
  return languages.findIndex(ln => ln === language);
};

const AudioTrackKnobBase = ({
  player,
  language,
  availableLanguages = [],
}) => {

  const options = availableLanguages
    .map(language => {
      return translateLanguage(language);
    });

  const currentLanguageIndex =
    findLanguageIndex(language, availableLanguages) || 0;

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
      selected={currentLanguageIndex}
    />
  );
};

module.exports = withModulesState({
  player: {
    language: "language",
    availableLanguages: "availableLanguages",
  },
})(AudioTrackKnobBase);
