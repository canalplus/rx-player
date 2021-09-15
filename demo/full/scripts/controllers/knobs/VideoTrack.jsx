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
  let selectedIndex = 0;

  if (!availableVideoTracks.length) {
    options = ["Not available"];
  } else {
    options = ["no video track"].concat(
      availableVideoTracks.map((track, i) => `track ${i}: ${track.id}`),
    );

    if (currentVideoTrack) {
      selectedIndex =
        1 + findVideoTrackIndex(currentVideoTrack, availableVideoTracks);
    }
  }

  const onTrackChange = ({ index }) => {
    if (index === 0) {
      player.dispatch("DISABLE_VIDEO_TRACK");
    } else {
      const track = availableVideoTracks[index - 1];
      player.dispatch("SET_VIDEO_TRACK", track);
    }
  };

  return (
    <Knob
      name="Video Track"
      ariaLabel="Update the video track"
      className={className}
      disabled={options.length <= 1}
      onChange={onTrackChange}
      options={options}
      selected={{ index: selectedIndex }}
    />
  );
};

export default React.memo(withModulesState({
  player: {
    videoTrack: "currentVideoTrack",
    availableVideoTracks: "availableVideoTracks",
  },
})(VideoTrackKnobBase));
