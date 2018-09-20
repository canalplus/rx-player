import log from "../../../log";
import startsWith from "../../../utils/starts_with";
import getLineType, { M3U8LineType } from "./get_line_type";
import parseEXTXMediaLine from "./parseEXTXMediaLine";
import type { IXMedia } from "./parseEXTXMediaLine";
import parseExtXStart from "./parseExtXStart";
import type { IExtXStart } from "./parseExtXStart";
import parseEXTXStreamInf from "./parseEXTXStreamInf";
import type { IParsedXStreamInfLine } from "./parseEXTXStreamInf";

export type IXStreamInf = IParsedXStreamInfLine & { defaultURI?: string };

export interface IMasterPlaylistIR {
  medias: IXMedia[];
  variants: IXStreamInf[];
  independentSegments: boolean;
  startInfo?: IExtXStart | undefined;
}

export default function createMasterPlaylistIR(playlist: string): IMasterPlaylistIR {
  const newLineChar = /\r\n|\n|\r/g;
  const linified = playlist.split(newLineChar);
  if (linified.length === 0) {
    throw new Error("Invalid playlist.");
  }

  const xMedias: IXMedia[] = [];
  const xVariants: IXStreamInf[] = [];
  let startInfo: IExtXStart | undefined;
  let independentSegments: boolean | undefined;
  for (let i = 0; i < linified.length; i++) {
    const line = linified[i];
    const lineType = getLineType(line);

    if (lineType === M3U8LineType.Tag) {
      if (startsWith(line, "#EXT-X-MEDIA:")) {
        const parsed = parseEXTXMediaLine(line);
        if (parsed !== null) {
          xMedias.push(parsed);
        }
      } else if (startsWith(line, "#EXT-X-STREAM-INF:")) {
        const parsed = parseEXTXStreamInf(line);
        if (parsed !== null) {
          xVariants.push(parsed);
        }
      } else if (startsWith(line, "#EXT-X-START:")) {
        const parsed = parseExtXStart(line);
        if (parsed !== null) {
          startInfo = parsed;
        }
      } else if (line === "#EXT-X-INDEPENDENT-SEGMENTS") {
        independentSegments = true;
      }
      // Not done yet
      // #EXT-X-I-FRAME-STREAM-INF
      // #EXT-X-SESSION-DATA
      // #EXT-X-SESSION-KEY
    } else if (lineType === M3U8LineType.URI) {
      const lastVariant = xVariants[xVariants.length - 1];
      if (lastVariant === undefined) {
        log.warn("HLS Parser: URI associated to no variant");
      } else if (lastVariant.defaultURI !== undefined) {
        log.warn(
          "HLS Parser: More than one URI associated to a variant",
          line,
          lastVariant.defaultURI,
        );
      } else {
        lastVariant.defaultURI = line;
      }
    }
  }

  return {
    medias: xMedias,
    variants: xVariants,
    startInfo,
    independentSegments: independentSegments ?? false,
  };
}
