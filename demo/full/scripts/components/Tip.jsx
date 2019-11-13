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
  setVideoThumbnailLoader,
}) => {
  const xPosition = tipPosition - tipsOffset;
  return (
    tipIsVideo ?
      <VideoThumbnailTip
        className="progress-tip"
        setVideoThumbnailLoader={setVideoThumbnailLoader}
        xPosition={xPosition}
      /> :
      <ImageTip
        className="progress-tip"
        image={image}
        xPosition={xPosition}
      />
  );
};
