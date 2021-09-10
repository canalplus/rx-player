import React from "react";
import withModulesState from "../../lib/withModulesState.jsx";
import Knob from "../../components/Knob.jsx";

const AudioBitrateKnobBase = ({
  player,
  className,
  audioBitrateAuto,
  audioBitrate,
  availableAudioBitrates = [],
}) => {
  let options = [];
  let selectedIndex;

  if (!availableAudioBitrates.length) {
    options = ["Not available"];
    selectedIndex = 0;
  } else if (availableAudioBitrates.length > 1) {
    const autoValue = audioBitrateAuto ?
      `auto (${audioBitrate})` : "auto";
    options = [autoValue, ...availableAudioBitrates];

    selectedIndex = audioBitrateAuto ?
      0 : (availableAudioBitrates.indexOf(audioBitrate) + 1 || 0);
  } else {
    options = availableAudioBitrates;
    selectedIndex = 0;
  }

  const onAudioBitrateChange = ({ index }) => {
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
      ariaLabel="Update the audio bitrate"
      className={className}
      disabled={options.length < 2}
      onChange={onAudioBitrateChange}
      options={options}
      selected={{ index: selectedIndex }}
    />
  );
};

export default React.memo(withModulesState({
  player: {
    audioBitrateAuto: "audioBitrateAuto",
    audioBitrate: "audioBitrate",
    availableAudioBitrates: "availableAudioBitrates",
  },
})(AudioBitrateKnobBase));
