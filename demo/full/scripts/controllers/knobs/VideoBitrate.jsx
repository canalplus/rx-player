import React from "react";
import withModulesState from "../../lib/withModulesState.jsx";
import Knob from "../../components/Knob.jsx";

const VideoBitrateKnobBase = ({
  player,
  className,
  videoBitrateAuto,
  videoRepresentation,
  videoTrack = [],
}) => {
  let options = [];
  let selectedIndex;

  const availableVideoBitrates =
    videoTrack === null || videoTrack === undefined ?
      [] :
      videoTrack.representations
        .map(r => r.bitrate)
        .filter(b => b !== undefined);

  if (!availableVideoBitrates.length) {
    options = ["Not available"];
    selectedIndex = 0;
  } else if (availableVideoBitrates.length > 1) {
    const autoValue =
      videoBitrateAuto &&
      typeof videoRepresentation.bitrate === "number" ?
        `auto (${videoRepresentation.bitrate})` :
        "auto";
    options = [autoValue, ...availableVideoBitrates];

    selectedIndex = videoBitrateAuto ?
      0 :
      (availableVideoBitrates.indexOf(videoRepresentation.bitrate) + 1 || 0);
  } else {
    options = availableVideoBitrates;
    selectedIndex = 0;
  }

  const onVideoBitrateChange = ({ index }) => {
    if (index > 0) {
      const bitrate = availableVideoBitrates[index - 1];
      player.dispatch("SET_VIDEO_BITRATE", bitrate);
    } else {
      player.dispatch("SET_VIDEO_BITRATE");
    }
  };

  return (
    <Knob
      name="Video Bitrate"
      ariaLabel="Update the video bitrate"
      className={className}
      disabled={availableVideoBitrates.length < 2}
      onChange={onVideoBitrateChange}
      options={options}
      selected={{ index: selectedIndex }}
    />
  );
};

export default React.memo(withModulesState({
  player: {
    videoBitrateAuto: "videoBitrateAuto",
    videoRepresentation: "videoRepresentation",
    videoTrack: "videoTrack",
  },
})(VideoBitrateKnobBase));
