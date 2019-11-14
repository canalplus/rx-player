import React from "react";
import VideoThumbnail from "./VideoThumbnail.jsx";
import ImageThumbnail from "./ImageThumbnail.jsx";

/**
 * React Component which Displays a thumbnail centered and on top
 * of the position wanted.
 */
export default ({
  thumbnailIsVideo,
  xPosition,
  image,
  setVideoElement,
}) => {
  return (
    thumbnailIsVideo ?
      <VideoThumbnail
        setVideoElement={setVideoElement}
        xPosition={xPosition}
      /> :
      <ImageThumbnail
        image={image}
        xPosition={xPosition}
      />
  );
};
