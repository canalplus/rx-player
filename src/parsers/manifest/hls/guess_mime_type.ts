/**
 * Copyright 2015 CANAL+ Group
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import startsWith from "../../../utils/starts_with";
import { IParsedAdaptationType } from "../types";
import { IMediaPlaylistIR } from "./createMediaPlaylistIR";

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
      return guessVideoMimeType(mediaPlst);
    case "video":
      return guessAudioMimeType(mediaPlst);
    case "text":
      return guessSubtitlesMimeType(mediaPlst);
  }
}
