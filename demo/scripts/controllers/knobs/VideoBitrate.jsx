const React = require("react");
const withModulesState = require("../../lib/withModulesState.jsx");
const Knob = require("../../components/Knob.jsx");

const VideoBitrateKnobBase = ({
  player,
  videoBitrateAuto,
  videoBitrate,
  availableVideoBitrates = [],
}) => {
  let options = [];
  let currentVideoBitrateIndex;

  if (availableVideoBitrates.length > 1) {
    const autoValue = videoBitrateAuto ?
      `auto (${videoBitrate})` : "auto";
    options = [autoValue, ...availableVideoBitrates];

    currentVideoBitrateIndex = videoBitrateAuto ?
      0 : (availableVideoBitrates.indexOf(videoBitrate) + 1 || 0);
  } else {
    options = availableVideoBitrates;
    currentVideoBitrateIndex = 0;
  }

  const onVideoBitrateChange = (evt) => {
    const index = +evt.target.value;
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
      disabled={availableVideoBitrates.length < 2}
      onChange={onVideoBitrateChange}
      options={options}
      selected={currentVideoBitrateIndex}
    />
  );
};

module.exports = withModulesState({
  player: {
    videoBitrateAuto: "videoBitrateAuto",
    videoBitrate: "videoBitrate",
    availableVideoBitrates: "availableVideoBitrates",
  },
})(VideoBitrateKnobBase);
