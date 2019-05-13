import React from "react";
import withModulesState from "../lib/withModulesState.jsx";

const PlayerKnobsInfos = ({
  shouldDisplay,
  close,
  liveGap,
  isContentLoaded,
}) => {

  if (!isContentLoaded) {
    return null;
  }

  const className = "player-knobs" + (shouldDisplay ? " fade-in-out" : "");
  const displayedLiveGap = Math.round(liveGap * 100) / 100;
  return (
    <div className={className}>
      <div className="player-knobs-header">
        <span className="player-knobs-title">Playback infos</span>
        <span
          className="player-knobs-close"
          onClick={() => { close(); }}
        >
          {String.fromCharCode(0xf00d)}
        </span>
      </div>
      <div className="player-knobs-content">
        <p>{"Live gap : " + displayedLiveGap + "s"}</p>
      </div>
    </div>
  );
};

export default withModulesState({
  player: {
    isStopped: "isStopped",
    isContentLoaded: "isContentLoaded",
    liveGap: "liveGap",
  },
})(PlayerKnobsInfos);
