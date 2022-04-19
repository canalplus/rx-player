type IWebkitFrameCountsHTMLVideoElement = HTMLVideoElement & {
  webkitDroppedFrameCount: number;
  webkitDecodedFrameCount: number;
  getVideoPlaybackQuality: () => IVideoPlaybackQuality;
};

interface IVideoPlaybackQuality {
  readonly creationTime: number;
  readonly totalVideoFrames: number;
  readonly droppedVideoFrames: number;
  readonly corruptedVideoFrames?: number;
  readonly totalFrameDelay?: number;
}

/**
 * Check if HTMLVideoElement has frame associated
 * webkit informations.
 * @param {HTMLVideoElement} videoElement
 */
function hasWebkitFrameCounts(
  videoElement: HTMLVideoElement
): videoElement is IWebkitFrameCountsHTMLVideoElement {
  return (
    (videoElement as IWebkitFrameCountsHTMLVideoElement).webkitDroppedFrameCount !=
      null &&
    (videoElement as IWebkitFrameCountsHTMLVideoElement).webkitDecodedFrameCount != null
  );
}

/**
 * Get informations about playback frame counts.
 * HTMLVideoElement API is supported in Firefox >= 25.
 *
 * @param {HTMLVideoElement} videoElement
 */
export function getVideoPlaybackQuality(
  videoElement: HTMLVideoElement
): IVideoPlaybackQuality {
  if (typeof videoElement.getVideoPlaybackQuality === "function") {
    return videoElement.getVideoPlaybackQuality();
  } else if (hasWebkitFrameCounts(videoElement)) {
    return {
      droppedVideoFrames: videoElement.webkitDroppedFrameCount,
      totalVideoFrames:
        videoElement.webkitDroppedFrameCount + videoElement.webkitDecodedFrameCount,
      creationTime: Date.now(),
    };
  } else {
    return {
      droppedVideoFrames: 0,
      totalVideoFrames: 0,
      creationTime: Date.now(),
    };
  }
}
