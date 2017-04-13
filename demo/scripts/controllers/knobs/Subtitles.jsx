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

const findLanguageIndex = (subtitle, languages) => {
  return languages.findIndex(ln =>
    ln.language === subtitle.language &&
    ln.closedCaption === subtitle.closedCaption
  );
};

const SubtitlesKnobBase = ({
  player,
  subtitle,
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

  const currentLanguageIndex = subtitle ?
    (findLanguageIndex(subtitle, availableSubtitles) + 1 || 0) : 0;

  const onLanguageChange = (evt) => {
    const index = +evt.target.value;
    if (index > 0) {
      const sub = availableSubtitles[index - 1];
      player.dispatch("SET_SUBTITLES_TRACK", sub);
    } else {
      player.dispatch("SET_SUBTITLES_TRACK");
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
    subtitle: "subtitle",
    availableSubtitles: "availableSubtitles",
  },
})(SubtitlesKnobBase);

