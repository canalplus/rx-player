import React from "react";
import translateLanguageCode from "../../lib/translateLanguageCode.js";
import withModulesState from "../../lib/withModulesState.jsx";
import Knob from "../../components/Knob.jsx";

const AUDIO_DESCRIPTION_ICON = "(AD)"; // String.fromCharCode(0xf29e);

const findAudioTrackIndex = (audioTrack, allAudioTracks) => {
  return allAudioTracks.findIndex(ln => ln.id === audioTrack.id);
};

const AudioTrackKnobBase = ({
  player,
  className,
  currentAudioTrack,
  availableAudioTracks = [],
}) => {
  let options = [];
  let selectedIndex;

  if (!availableAudioTracks.length) {
    options = ["Not available"];
    selectedIndex = 0;
  } else {
    options = availableAudioTracks
      .map(audioTrack => {
        return translateLanguageCode(audioTrack.normalized) +
          (audioTrack.audioDescription ?
            (" " + AUDIO_DESCRIPTION_ICON) : "");
      });

    selectedIndex = currentAudioTrack ?
      Math.max(findAudioTrackIndex(currentAudioTrack, availableAudioTracks), 0)
      : 0;
  }

  const onAudioTrackChange = ({ index }) => {
    const track = availableAudioTracks[index];
    player.dispatch("SET_AUDIO_TRACK", track);
  };

  return (
    <Knob
      name="Audio Language"
      ariaLabel="Update the audio track"
      className={className}
      disabled={availableAudioTracks.length < 2}
      onChange={onAudioTrackChange}
      options={options}
      selected={{ index: selectedIndex }}
    />
  );
};

export default React.memo(withModulesState({
  player: {
    audioTrack: "currentAudioTrack",
    availableAudioTracks: "availableAudioTracks",
  },
})(AudioTrackKnobBase));
