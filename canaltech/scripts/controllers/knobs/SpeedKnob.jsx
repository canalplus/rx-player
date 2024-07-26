import React from "react";
import withModulesState from "../../lib/withModulesState.jsx";
import Knob from "../../components/Knob.jsx";

const AVAILABLE_RATES = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.5, 3];

const PlaybackRateKnob = ({
  player,
  className,
  playbackRate,
}) => {
  const aliases = { 1: "Normal" };
  const options = AVAILABLE_RATES.map((rate) => {
    return aliases[rate] || rate;
  });

  let selectedIndex = AVAILABLE_RATES
    .findIndex((rate) => playbackRate === rate);

  const onPlaybackRateChange = (evt) => {
    const index = +evt.target.value;
    if (index > -1) {
      selectedIndex = index;
      const rate = AVAILABLE_RATES[index];
      player.dispatch("SET_PLAYBACK_RATE", rate);
    }
  };

  return (
    <Knob
      className={className}
      name="Playback Rate"
      disabled={options.length < 2}
      onChange={onPlaybackRateChange}
      options={options}
      selected={selectedIndex}
    />
  );
};

export default withModulesState({
  player: {
    playbackRate: "playbackRate",
  },
})(PlaybackRateKnob);
