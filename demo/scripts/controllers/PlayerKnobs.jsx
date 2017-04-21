const React = require("react");
const withModulesState = require("../lib/withModulesState.jsx");
const VideoBitrateKnob = require("./knobs/VideoBitrate.jsx");
const AudioBitrateKnob = require("./knobs/AudioBitrate.jsx");
const LanguageKnob = require("./knobs/AudioTrack.jsx");
const SubtitlesKnob = require("./knobs/Subtitles.jsx");

const PlayerKnobs = ({
  player,
  hasLoadedContent,
  hasEnded,
}) => {

  if (!hasLoadedContent || hasEnded) {
    return null;
  }

  return (
    <div className="player-knobs">
      <AudioBitrateKnob player={player} />
      <VideoBitrateKnob player={player} />
      <LanguageKnob player={player} />
      <SubtitlesKnob player={player} />
    </div>
  );
};

module.exports = withModulesState({
  player: {
    isStopped: "isStopped",
    hasLoadedContent: "hasLoadedContent",
    hasEnded: "hasEnded",
  },
})(PlayerKnobs);
