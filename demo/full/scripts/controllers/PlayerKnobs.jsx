import React from "react";
import withModulesState from "../lib/withModulesState.jsx";
import AudioBitrateKnob from "./knobs/AudioBitrate.jsx";
import VideoBitrateKnob from "./knobs/VideoBitrate.jsx";
import LanguageKnob from "./knobs/AudioTrack.jsx";
import SubtitlesKnob from "./knobs/Subtitles.jsx";
import VideoTrack from "./knobs/VideoTrack.jsx";

const PlayerKnobs = ({
  player,
  availableVideoTracks,
  isContentLoaded,
  hasEnded,
}) => {

  if (!isContentLoaded || hasEnded) {
    return null;
  }

  return (
    <div className="player-knobs">
      <AudioBitrateKnob player={player} />
      <VideoBitrateKnob player={player} />
      <LanguageKnob player={player} />
      <SubtitlesKnob player={player} />
      {
        availableVideoTracks.length > 1 ?
          <VideoTrack player={player} /> : null
      }
    </div>
  );
};

export default withModulesState({
  player: {
    isStopped: "isStopped",
    isContentLoaded: "isContentLoaded",
    hasEnded: "hasEnded",
    availableVideoTracks: "availableVideoTracks",
  },
})(PlayerKnobs);
