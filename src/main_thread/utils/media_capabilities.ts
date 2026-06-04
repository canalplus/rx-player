import type { IMediaElement } from "../../compat/browser_compatibility_types";
import features from "../../features";
import type { ITextDisplayerOptions } from "../init/types";

export function canHandleVideoTracks(mediaElement: IMediaElement | null): boolean {
  return mediaElement?.nodeName.toLowerCase() === "video";
}

export function canHandleTextTracks(textTrackOptions: ITextDisplayerOptions): boolean {
  return (
    (textTrackOptions.textTrackMode === "html" && features.htmlTextDisplayer !== null) ||
    features.nativeTextDisplayer !== null
  );
}
