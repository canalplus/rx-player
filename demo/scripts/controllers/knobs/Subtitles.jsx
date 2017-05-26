const React = require("react");
const withModulesState = require("../../lib/withModulesState.jsx");
const Knob = require("../../components/Knob.jsx");

const CLOSED_CAPTION_ICON = "(CC)"; // String.fromCharCode(0xf2a4);
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
        return translateLanguage(subtitle.language) +
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
      disabled={availableSubtitles.length < 2}
      onChange={onLanguageChange}
      options={options}
      selected={currentLanguageIndex}
    />
  );
};

module.exports = withModulesState({
  player: {
    subtitle: "currentSubtitle",
    availableSubtitles: "availableSubtitles",
  },
})(SubtitlesKnobBase);

