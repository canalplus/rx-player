import React from "react";
import withModulesState from "../../lib/withModulesState.jsx";
import Knob from "../../components/Knob.jsx";

const findVideoTrackIndex = (track, tracks) => {
  return tracks.findIndex(ln => ln.id === track.id);
};

const VideoTrackKnobBase = ({
  player,
  className,
  availableVideoTracks = [],
  currentVideoTrack,
}) => {
  let options = [];
  let selectedIndex;

  if (!availableVideoTracks.length) {
    options = ["Not available"];
    selectedIndex = 0;
  } else {
    options = availableVideoTracks
      .map((track, i) => `track ${i}: ${track.id}`);

    selectedIndex = currentVideoTrack ?
      Math.max(findVideoTrackIndex(currentVideoTrack, availableVideoTracks), 0)
      : 0;
  }

  const onTrackChange = (evt) => {
    const index = +evt.target.value;
    const track = availableVideoTracks[index];
    player.dispatch("SET_VIDEO_TRACK", track);
  };

  return (
    <Knob
      name="Video Track"
      ariaLabel="Update the video track"
      className={className}
      disabled={availableVideoTracks.length < 2}
      onChange={onTrackChange}
      options={options}
      selected={selectedIndex}
    />
  );
};

export default withModulesState({
  player: {
    videoTrack: "currentVideoTrack",
    availableVideoTracks: "availableVideoTracks",
  },
})(VideoTrackKnobBase);
