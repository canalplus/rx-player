import React from "react";
import withModulesState from "../lib/withModulesState.jsx";
import AudioBitrateKnob from "./knobs/AudioBitrate.jsx";
import VideoBitrateKnob from "./knobs/VideoBitrate.jsx";
import LanguageKnob from "./knobs/AudioTrack.jsx";
import SubtitlesKnob from "./knobs/Subtitles.jsx";
import VideoTrack from "./knobs/VideoTrack.jsx";
import PlaybackRateKnob from "./knobs/SpeedKnob.jsx";

function stopClickEventPropagation(element) {
  if (element != null) {
    element.addEventListener("click", (evt) => {
      evt.stopPropagation();
    });
  }
}

const PlayerKnobs = ({
  shouldDisplay,
  close,
  player,
  availableVideoTracks,
  isContentLoaded,
  hasEnded,
}) => {

  if (!isContentLoaded || hasEnded) {
    return null;
  }

  const className = "player-knobs" + (shouldDisplay ? " fade-in-out" : "");

  return (
    <div
      className={className}
      ref={stopClickEventPropagation}
    >
      <div className="player-knobs-header">
        <span className="player-knobs-title">Settings</span>
        <span
          className="player-knobs-close"
          onClick={() => { close(); }}
        >
          {String.fromCharCode(0xf00d)}
        </span>
      </div>
      <div className="player-knobs-knobs">
        <PlaybackRateKnob player={player} />
        <AudioBitrateKnob player={player} />
        <VideoBitrateKnob player={player} />
        <LanguageKnob player={player} />
        <SubtitlesKnob player={player} />
        {
          availableVideoTracks.length > 1 ?
            <VideoTrack player={player} /> : null
        }
      </div>
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
