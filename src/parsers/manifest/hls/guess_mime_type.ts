import startsWith from "../../../utils/starts_with";
import type { IParsedAdaptationType } from "../types";
import type { IMediaPlaylistIR } from "./createMediaPlaylistIR";

/**
 * @param {Object} IMediaPlaylistIR
 * @returns {string|undefined}
 */
function guessVideoMimeType(mediaPlst: IMediaPlaylistIR): string | undefined {
  // From here, some players (like the Shaka-Player) seem to base themselves on the
  // potential URI in the extension
  if (mediaPlst.segments.length === 0) {
    return undefined;
  }

  const firstSegment = mediaPlst.segments[0];
  const fileExtension = firstSegment.uri.split(".").pop();
  if (fileExtension === "" || fileExtension === undefined) {
    return undefined;
  }
  if (fileExtension === "mp4" || startsWith(fileExtension, "m4")) {
    return "video/mp4";
  } else if (fileExtension === "ts") {
    return "video/mp2t";
  }
  return undefined;

  // Note: the shaka-player does in a worst case scenario a HEAD request into
  // the first segment here and check its content-type. We could do also do that
  // but that may be unneedlessly complicated for now
}

function guessAudioMimeType(mediaPlst: IMediaPlaylistIR): string | undefined {
  // From here, some players (like the Shaka-Player) seem to base themselves on the
  // potential URI in the extension
  if (mediaPlst.segments.length === 0) {
    return undefined;
  }

  const firstSegment = mediaPlst.segments[0];
  const fileExtension = firstSegment.uri.split(".").pop();
  if (fileExtension === "" || fileExtension === undefined) {
    return undefined;
  }
  if (fileExtension === "mp4" || startsWith(fileExtension, "m4")) {
    return "audio/mp4";
  } else if (fileExtension === "ts") {
    return "audio/mp2t";
  }
  return undefined;

  // Note: the shaka-player does in a worst case scenario a HEAD request into
  // the first segment here and check its content-type. We could do also do that
  // but that may be unneedlessly complicated for now
}

function guessSubtitlesMimeType(mediaPlst: IMediaPlaylistIR): string | undefined {
  // From here, some players (like the Shaka-Player) seem to base themselves on the
  // potential URI in the extension
  if (mediaPlst.segments.length === 0) {
    return undefined;
  }

  const firstSegment = mediaPlst.segments[0];
  const fileExtension = firstSegment.uri.split(".").pop();
  if (fileExtension === "" || fileExtension === undefined) {
    return undefined;
  }

  if (fileExtension === "mp4" || startsWith(fileExtension, "m4")) {
    return "application/mp4";

    /* tslint:disable prefer-switch */
  } else if (fileExtension === "vtt" || fileExtension === "wvtt") {
    /* tslint:enable prefer-switch */
    return "text/vtt";
  } else if (fileExtension === "ttml") {
    return "application/ttml+xml";
  }
  return undefined;

  // Note: the shaka-player does in a worst case scenario a HEAD request into
  // the first segment here and check its content-type. We could do also do that
  // but that may be unneedlessly complicated for now
}

export default function guessMimeType(
  type: IParsedAdaptationType,
  mediaPlst: IMediaPlaylistIR,
): string | undefined {
  switch (type) {
    case "audio":
      return guessAudioMimeType(mediaPlst);
    case "video":
      return guessVideoMimeType(mediaPlst);
    case "text":
      return guessSubtitlesMimeType(mediaPlst);
  }
}
