import log from "../../../log";
import arrayFindIndex from "../../../utils/array_find_index";
import type { IRange } from "../../../utils/ranges";
import type { ICompleteSegmentInfo, IPushChunkInfos, ISBOperation } from "./types";
import { SegmentSink, SegmentSinkOperation } from "./types";

export default class DummySegmentSink extends SegmentSink {
  /** "Type" of the buffer concerned. */
  public readonly bufferType: "audio" | "video" | "text";
  private _buffer: Array<ISBOperation<unknown>>;
  private _initSegments: IInitSegmentItem[];

  /**
   * @constructor
   * @param {string} bufferType
   * @param {string} codec
   */
  constructor(bufferType: "audio" | "video" | "text", codec: string | undefined) {
    super();
    log.info("AVSB: calling `mediaSource.addSourceBuffer`", codec);
    this.bufferType = bufferType;
    this.codec = codec;
    this._buffer = [];
    this._initSegments = [];
  }

  public getStoredData(): {
    codec: string | undefined;
    bufferType: "audio" | "video" | "text";
    initSegments: IInitSegmentItem[];
    operations: Array<ISBOperation<unknown>>;
  } {
    return {
      initSegments: this._initSegments,
      operations: this._buffer,
      codec: this.codec,
      bufferType: this.bufferType,
    };
  }

  public synchronizeInventory(): void {
    // noop for now
  }

  /** @see SegmentSink */
  public declareInitSegment(uniqueId: string, initSegmentData: unknown): void {
    const index = arrayFindIndex(this._initSegments, (i) => i.uniqueId === uniqueId);
    if (index >= 0) {
      this._initSegments.splice(index);
    }
    this._initSegments.push({ uniqueId, initSegmentData });
  }

  /** @see SegmentSink */
  public freeInitSegment(_uniqueId: string): void {
    // noop for now, as we do not want to risk freeing used init segments
  }

  /** @see SegmentSink */
  public async pushChunk(infos: IPushChunkInfos<unknown>): Promise<IRange[] | undefined> {
    this._buffer.push({ type: SegmentSinkOperation.Push, value: infos });
    // TODO replace already buffered + range?
    return Promise.resolve(undefined);
  }

  /** @see SegmentSink */
  public async removeBuffer(start: number, end: number): Promise<IRange[] | undefined> {
    this._buffer.push({ type: SegmentSinkOperation.Remove, value: { start, end } });
    // TODO evict+range?
    return Promise.resolve(undefined);
  }

  /** @see SegmentSink */
  public async signalSegmentComplete(infos: ICompleteSegmentInfo): Promise<void> {
    this._buffer.push({ type: SegmentSinkOperation.SignalSegmentComplete, value: infos });
    // TODO replace already buffered + range?
    return Promise.resolve(undefined);
  }

  /**
   * Returns the list of every operations that the `AudioVideoSegmentSink` is
   * still processing.
   * @returns {Array.<Object>}
   */
  public getPendingOperations(): Array<ISBOperation<unknown>> {
    return this._buffer;
  }

  /** @see SegmentSink */
  public dispose(): void {
    this._buffer = [];
    this._initSegments = [];
  }
}

export interface IInitSegmentItem {
  uniqueId: string;
  initSegmentData: unknown;
}
