import * as React from "react";
import AudioRepresentationKnob from "./knobs/AudioRepresentation";
import VideoRepresentationKnob from "./knobs/VideoRepresentation";
import LanguageKnob from "./knobs/AudioTrack";
import SubtitlesKnob from "./knobs/Subtitles";
import VideoTrack from "./knobs/VideoTrack";
import PlaybackRateKnob from "./knobs/SpeedKnob";
import type { IPlayerModule } from "../modules/player/index";
import useModuleState from "../lib/useModuleState";

function PlayerKnobsSettings({
  shouldDisplay,
  close,
  player,
}: {
  shouldDisplay: boolean;
  close: () => void;
  player: IPlayerModule;
}) {
  const lowLatencyMode = useModuleState(player, "lowLatencyMode");
  const isContentLoaded = useModuleState(player, "isContentLoaded");
  if (!isContentLoaded) {
    return null;
  }

  const className = "player-knobs settings" + (shouldDisplay ? " fade-in-out" : "");

  return (
    <div className={className}>
      <div className="player-knobs-header">
        <span className="player-knobs-title">Settings</span>
        <span className="player-knobs-close" onClick={close}>
          {String.fromCharCode(0xf00d)}
        </span>
      </div>
      <div className="player-knobs-content">
        {lowLatencyMode ? null : ( // In lowLatencyMode, we take back control of the rate
          <PlaybackRateKnob className="black-knob" player={player} />
        )}
        <AudioRepresentationKnob className="black-knob" player={player} />
        <VideoRepresentationKnob className="black-knob" player={player} />
        <LanguageKnob className="black-knob" player={player} />
        <SubtitlesKnob className="black-knob" player={player} />
        <VideoTrack className="black-knob" player={player} />
      </div>
    </div>
  );
}

export default React.memo(PlayerKnobsSettings);
