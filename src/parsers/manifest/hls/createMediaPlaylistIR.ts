import log from "../../../log";
import startsWith from "../../../utils/starts_with";
import getLineType, { M3U8LineType } from "./get_line_type";

export interface IInitSegmentInfo {
  uri: string;
  byteRange: [number, number | undefined] | undefined;
}

export interface IMediaPlaylistIR {
  discontinuitySequence: number | undefined;
  endList: boolean;
  iFramesOnly: boolean;
  initSegment: IInitSegmentInfo | undefined;
  mediaSequence: number | undefined;
  playlistType: "VOD" | "EVENT" | undefined;
  segments: IHLSSegment[];
  targetDuration: number | undefined;
}

export interface IHLSSegment {
  duration: number;
  title: string | undefined;
  byteRange: [number, number | undefined] | undefined;
  discontinuity: boolean;
  programDateTime: Date | undefined;
  uri: string;
}

interface IPartialHLSSegment {
  duration?: number;
  title?: string | undefined;
  byteRange?: [number, number | undefined] | undefined;
  discontinuity?: boolean;
  programDateTime?: Date | undefined;
  uri?: string;
}

/**
 * @param {string} playlist
 * @returns {Object}
 */
export default function createMediaPlaylistIR(playlist: string): IMediaPlaylistIR {
  const newLineChar = /\r\n|\n|\r/g;
  const linified = playlist.split(newLineChar);
  if (linified.length === 0) {
    throw new Error("Invalid playlist.");
  }

  const segments: IHLSSegment[] = [];
  let discontinuitySequence: number | undefined;
  let endList: true | undefined;
  let iFramesOnly: true | undefined;
  let initSegment: IInitSegmentInfo | undefined;
  let mediaSequence: number | undefined;
  let playlistType: "EVENT" | "VOD" | undefined;
  let targetDuration: number | undefined;

  let currentSegment: IPartialHLSSegment = {};
  for (let i = 0; i < linified.length; i++) {
    const line = linified[i];
    const lineType = getLineType(line);

    if (lineType === M3U8LineType.Tag) {
      if (startsWith(line, "#EXTINF:")) {
        if (currentSegment.duration !== undefined) {
          log.warn("HLS Parser: More than one duration defined for a segment");
        }
        const indexOfComma = line.indexOf(",");
        const parsedDuration = parseInteger(
          "duration",
          line,
          8,
          indexOfComma < 0 ? line.length : indexOfComma,
        );
        if (parsedDuration !== null) {
          currentSegment.duration = parsedDuration;
        }
        if (indexOfComma > 0 && indexOfComma > line.length - 1) {
          currentSegment.title = line.substring(indexOfComma + 1);
        }
      } else if (startsWith(line, "#EXT-X-BYTERANGE:")) {
        const byteRange = parseByteRange(line, 17);
        if (byteRange !== null) {
          currentSegment.byteRange = byteRange;
        }
      } else if (startsWith(line, "#EXT-X-TARGETDURATION:")) {
        const parsed = parseInteger("TARGETDURATION", line, 22);
        if (parsed !== null) {
          targetDuration = parsed;
        }
      } else if (startsWith(line, "#EXT-X-MEDIA-SEQUENCE:")) {
        const parsed = parseInteger("MEDIA-SEQUENCE", line, 22);
        if (parsed !== null) {
          mediaSequence = parsed;
        }
      } else if (startsWith(line, "#EXT-X-DISCONTINUITY-SEQUENCE:")) {
        const parsed = parseInteger("DISCONTINUITY-SEQUENCE", line, 36);
        if (parsed !== null) {
          discontinuitySequence = parsed;
        }
      } else if (line === "#EXT-X-DISCONTINUITY") {
        currentSegment.discontinuity = true;
      } else if (line === "#EXT-X-ENDLIST") {
        endList = true;
      } else if (startsWith(line, "#EXT-X-PLAYLIST-TYPE:")) {
        const type = line.substring(21, line.length);
        if (type !== "VOD" && type !== "EVENT") {
          log.warn("HLS Parser: Invalid PLAYLIST-TYPE:", type);
        } else {
          playlistType = type;
        }
      } else if (line === "#EXT-X-I-FRAMES-ONLY") {
        iFramesOnly = true;
      } else if (startsWith(line, "#EXT-X-MAP:")) {
        const indexOfComma = line.indexOf(",");

        // XXX TODO URI=
        const uri = line.substring(
          16,
          indexOfComma < 16 ? line.length - 1 : indexOfComma - 1,
        );
        const byteRange =
          indexOfComma >= 0
            ? parseByteRange(line, indexOfComma + 1) ?? undefined
            : undefined;
        initSegment = { uri, byteRange };
      } else if (startsWith(line, "#EXT-X-PROGRAM-DATE-TIME:")) {
        const dateStr = line.substring(25, line.length);
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) {
          log.warn("HLS Parser: Invalid PROGRAM-DATE-TIME", dateStr);
        } else {
          currentSegment.programDateTime = date;
        }
      }

      // Left to do:
      // #EXT-X-DATERANGE
      // #EXT-X-KEY
    } else if (lineType === M3U8LineType.URI) {
      const { duration } = currentSegment;
      if (duration === undefined) {
        log.warn("HLS Parser: Cannot add segment: no set duration");
      } else {
        segments.push({
          duration,
          title: currentSegment.title,
          byteRange: currentSegment.byteRange,
          discontinuity: currentSegment.discontinuity ?? false,
          programDateTime: currentSegment.programDateTime,
          uri: line,
        });
        currentSegment = {};
      }
    }
  }

  return {
    discontinuitySequence,
    endList: endList ?? false,
    iFramesOnly: iFramesOnly ?? false,
    initSegment,
    mediaSequence,
    playlistType,
    segments,
    targetDuration,
  };
}

/**
 * @param {string} description
 * @param {string} line
 * @param {number} startIndex
 * @param {number} [endIndex]
 * @returns {number|null}
 */
function parseInteger(
  description: string,
  line: string,
  startIndex: number,
  endIndex?: number,
): number | null {
  const integerStr = line.substring(startIndex, endIndex ?? line.length);
  const parsedInt = parseInt(integerStr, 10);
  if (isNaN(parsedInt)) {
    log.warn(`HLS Parser: Invalid ${description}:`, integerStr);
    return null;
  }
  return parsedInt;
}

/**
 * @param {string} line
 * @param {number} startIndex
 * @returns {Array.<number|undefined>|null}
 */
function parseByteRange(
  line: string,
  startIndex: number,
): [number, number | undefined] | null {
  // French and English have two completely different ways to call that
  // thing. For clarity, I chose:
  const indexOfSnailLookingChar = line.indexOf("@");

  const firstPart = line.substring(
    startIndex,
    indexOfSnailLookingChar < 0 ? line.length : indexOfSnailLookingChar,
  );
  const secondPart =
    indexOfSnailLookingChar < 0 || indexOfSnailLookingChar === line.length - 1
      ? undefined
      : line.substring(indexOfSnailLookingChar + 1, line.length);
  const parsedFirstPart = parseInt(firstPart, 10);
  const parsedSecondPart =
    secondPart === undefined ? undefined : parseInt(secondPart, 10);
  if (
    isNaN(parsedFirstPart) ||
    (parsedSecondPart !== undefined && isNaN(parsedSecondPart))
  ) {
    log.warn("HLS Parser: Invalid byte-range:", firstPart, secondPart);
    return null;
  }
  return [parsedFirstPart, parsedSecondPart];
}
