import React from "react";
import withModulesState from "../../lib/withModulesState.jsx";
import Knob from "../../components/Knob.jsx";

const AudioRepresentationKnobBase = ({
  player,
  className,
  audioRepresentationsLocked,
  audioRepresentation,
  audioTrack = [],
}) => {
  let options = [];
  let selectedIndex;

  const availableAudioRepresentations =
    audioTrack === null || audioTrack === undefined ?
      [] :
      audioTrack.representations;

  if (!availableAudioRepresentations.length) {
    options = ["Not available"];
    selectedIndex = 0;
  } else if (availableAudioRepresentations.length > 1) {
    let autoValue = "auto";
    if (!audioRepresentationsLocked) {
      const info = getAudioRepresentationInfo(audioRepresentation);
      if (info.length > 0) {
        autoValue += " (" + info.join(", ") + ")";
      }
    }

    const correspondingInfo = availableAudioRepresentations
      .map(r => getAudioRepresentationInfo(r).join(", "));
    options = [autoValue, ...correspondingInfo];

    selectedIndex = audioRepresentationsLocked ?
      (availableAudioRepresentations
        .findIndex(r => r.id === audioRepresentation.id) + 1 || 0) :
      0;
  } else {
    options = availableAudioRepresentations
      .map(r => getAudioRepresentationInfo(r).join(", "));
    selectedIndex = 0;
  }

  const onAudioBitrateChange = ({ index }) => {
    if (index > 0) {
      const rep = availableAudioRepresentations[index - 1];
      player.dispatch("LOCK_AUDIO_REPRESENTATIONS", [rep]);
    } else {
      player.dispatch("UNLOCK_AUDIO_REPRESENTATIONS");
    }
  };

  return (
    <Knob
      name="Audio quality"
      ariaLabel="Update the audio quality"
      className={className}
      disabled={availableAudioRepresentations.length < 2}
      onChange={onAudioBitrateChange}
      options={options}
      selected={{ index: selectedIndex }}
    />
  );
};

export default React.memo(withModulesState({
  player: {
    audioRepresentationsLocked: "audioRepresentationsLocked",
    audioRepresentation: "audioRepresentation",
    audioTrack: "audioTrack",
  },
})(AudioRepresentationKnobBase));

function getAudioRepresentationInfo(audioRepresentation) {
  const info = [];
  if (audioRepresentation.bitrate !== undefined) {
    info.push(`${Math.round(audioRepresentation.bitrate / 1000)}kbps`);
  }
  if (info.length === 0) {
    info.push("id: " + audioRepresentation.id);
  }
  return info;
}

