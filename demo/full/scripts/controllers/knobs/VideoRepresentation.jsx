import React from "react";
import withModulesState from "../../lib/withModulesState.jsx";
import Knob from "../../components/Knob.jsx";

const VideoRepresentationKnobBase = ({
  player,
  className,
  videoRepresentationsLocked,
  videoRepresentation,
  videoTrack = [],
}) => {
  let options = [];
  let selectedIndex;

  const availableVideoRepresentations =
    videoTrack === null || videoTrack === undefined ?
      [] :
      videoTrack.representations;

  if (!availableVideoRepresentations.length) {
    options = ["Not available"];
    selectedIndex = 0;
  } else if (availableVideoRepresentations.length > 1) {
    let autoValue = "auto";
    if (!videoRepresentationsLocked) {
      const info = getVideoRepresentationInfo(videoRepresentation);
      if (info.length > 0) {
        autoValue += " (" + info.join(", ") + ")";
      }
    }

    const correspondingInfo = availableVideoRepresentations
      .map(r => getVideoRepresentationInfo(r).join(", "));
    options = [autoValue, ...correspondingInfo];

    selectedIndex = videoRepresentationsLocked ?
      (availableVideoRepresentations
        .findIndex(r => r.id === videoRepresentation.id) + 1 || 0) :
      0
  } else {
    options = availableVideoRepresentations
      .map(r => getVideoRepresentationInfo(r).join(", "));
    selectedIndex = 0;
  }

  const onVideoBitrateChange = ({ index }) => {
    if (index > 0) {
      const rep = availableVideoRepresentations[index - 1];
      player.dispatch("LOCK_VIDEO_REPRESENTATIONS", [rep]);
    } else {
      player.dispatch("UNLOCK_VIDEO_REPRESENTATIONS");
    }
  };

  return (
    <Knob
      name="Video quality"
      ariaLabel="Update the video quality"
      className={className}
      disabled={availableVideoRepresentations.length < 2}
      onChange={onVideoBitrateChange}
      options={options}
      selected={{ index: selectedIndex }}
    />
  );
};

export default React.memo(withModulesState({
  player: {
    videoRepresentationsLocked: "videoRepresentationsLocked",
    videoRepresentation: "videoRepresentation",
    videoTrack: "videoTrack",
  },
})(VideoRepresentationKnobBase));

function getVideoRepresentationInfo(videoRepresentation) {
  const info = [];
  if (videoRepresentation.height !== undefined) {
    info.push(`${videoRepresentation.height}p`);
  }
  if (videoRepresentation.bitrate !== undefined) {
    info.push(`${Math.round(videoRepresentation.bitrate / 1000)}kbps`);
  }
  if (info.length === 0) {
    info.push("id: " + videoRepresentation.id);
  }
  return info;
}
