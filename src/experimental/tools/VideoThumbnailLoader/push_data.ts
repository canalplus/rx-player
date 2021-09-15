import {
  Observable,
} from "rxjs";
import { AudioVideoSegmentBuffer } from "../../../core/segment_buffers/implementations";
import Manifest, {
  Adaptation,
  ISegment,
  Period,
  Representation,
} from "../../../manifest";
import { ISegmentParserParsedSegment } from "../../../transports";

/**
 * Push data to the video source buffer.
 * @param {Object} inventoryInfos
 * @param {Function} segmentParser
 * @param {Uint8Array} responseData
 * @param {Object} videoSourceBuffer
 * @returns
 */
export default function pushData(
  inventoryInfos: { manifest: Manifest;
                    period: Period;
                    adaptation: Adaptation;
                    representation: Representation;
                    segment: ISegment;
                    start: number;
                    end: number; },
  parsed: ISegmentParserParsedSegment<Uint8Array | ArrayBuffer>,
  videoSourceBuffer: AudioVideoSegmentBuffer
): Observable<void> {
  const { chunkData, appendWindow } = parsed;
  const segmentData = chunkData instanceof ArrayBuffer ?
    new Uint8Array(chunkData) : chunkData;
  return videoSourceBuffer
    .pushChunk({ data: { chunk: segmentData,
                         timestampOffset: 0,
                         appendWindow,
                         initSegment: null,
                         codec: inventoryInfos
                           .representation.getMimeTypeString() },
                 inventoryInfos });
}
