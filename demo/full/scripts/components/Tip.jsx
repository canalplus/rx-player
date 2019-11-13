import React from "react";
import VideoThumbnailTip from "./VideoThumbnailTip.jsx";
import ImageTip from "./ImageTip.jsx";

/**
 * React Component which Displays a thumbnail tip centered and on top
 * of the position wanted.
 */
export default ({
  tipsOffset,
  tipPosition,
  tipIsVideo,
  image,
  setVideoElement,
}) => {
  const xPosition = tipPosition - tipsOffset;
  return (
    tipIsVideo ?
      <VideoThumbnailTip
        className="progress-tip"
        setVideoElement={setVideoElement}
        xPosition={xPosition}
      /> :
      <ImageTip
        className="progress-tip"
        image={image}
        xPosition={xPosition}
      />
  );
};
