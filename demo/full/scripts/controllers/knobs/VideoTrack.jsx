import React from "react";
import withModulesState from "../../lib/withModulesState.jsx";
import Knob from "../../components/Knob.jsx";

const findVideoTrackIndex = (trackId, tracks) => {
  return tracks.findIndex(tk => tk.id === trackId);
};

const VideoTrackKnobBase = ({
  player,
  currentVideoTrackId,
  availableVideoTracks = [],
}) => {
  let options = [];
  let selectedIndex;

  if (!availableVideoTracks.length) {
    options = ["Not available"];
    selectedIndex = 0;
  } else {
    options = availableVideoTracks
      .map((track, i) => `track ${i}: ${track.id}`);

    selectedIndex = currentVideoTrackId ?
      Math.max(
        findVideoTrackIndex(currentVideoTrackId, availableVideoTracks),
        0
      ) : 0;
  }

  const onTrackChange = (evt) => {
    const index = +evt.target.value;
    const track = availableVideoTracks[index];
    player.dispatch("SET_VIDEO_TRACK", track);
  };

  return (
    <Knob
      name="Video Track"
      disabled={availableVideoTracks.length < 2}
      onChange={onTrackChange}
      options={options}
      selected={selectedIndex}
    />
  );
};

export default withModulesState({
  player: {
    videoTrackId: "currentVideoTrackId",
    availableVideoTracks: "availableVideoTracks",
  },
})(VideoTrackKnobBase);
