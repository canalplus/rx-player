import React from "react";
import withModulesState from "../lib/withModulesState.jsx";
import AudioBitrateKnob from "./knobs/AudioBitrate.jsx";
import VideoBitrateKnob from "./knobs/VideoBitrate.jsx";
import LanguageKnob from "./knobs/AudioTrack.jsx";
import SubtitlesKnob from "./knobs/Subtitles.jsx";

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

export default withModulesState({
  player: {
    isStopped: "isStopped",
    hasLoadedContent: "hasLoadedContent",
    hasEnded: "hasEnded",
  },
})(PlayerKnobs);
