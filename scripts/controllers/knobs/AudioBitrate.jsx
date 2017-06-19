import React from "react";
import withModulesState from "../../lib/withModulesState.jsx";
import Knob from "../../components/Knob.jsx";

const AudioBitrateKnobBase = ({
  player,
  audioBitrateAuto,
  audioBitrate,
  availableAudioBitrates = [],
}) => {
  let options = [];
  let currentAudioBitrateIndex;

  if (availableAudioBitrates.length > 1) {
    const autoValue = audioBitrateAuto ?
      `auto (${audioBitrate})` : "auto";
    options = [autoValue, ...availableAudioBitrates];

    currentAudioBitrateIndex = audioBitrateAuto ?
      0 : (availableAudioBitrates.indexOf(audioBitrate) + 1 || 0);
  } else {
    options = availableAudioBitrates;
    currentAudioBitrateIndex = 0;
  }

  const onAudioBitrateChange = (evt) => {
    const index = +evt.target.value;
    if (index > 0) {
      const bitrate = availableAudioBitrates[index - 1];
      player.dispatch("SET_AUDIO_BITRATE", bitrate);
    } else {
      player.dispatch("SET_AUDIO_BITRATE");
    }
  };

  return (
    <Knob
      name="Audio Bitrate"
      disabled={availableAudioBitrates.length < 2}
      onChange={onAudioBitrateChange}
      options={options}
      selected={currentAudioBitrateIndex}
    />
  );
};

export default withModulesState({
  player: {
    audioBitrateAuto: "audioBitrateAuto",
    audioBitrate: "audioBitrate",
    availableAudioBitrates: "availableAudioBitrates",
  },
})(AudioBitrateKnobBase);
