import { MediaError, NetworkError } from "../../../errors";
import log from "../../../log";
import type { IRepresentationIndex, ISegment } from "../../../manifest";
import resolveURL from "../../../utils/resolve_url";
import type { IHLSSegment, IInitSegmentInfo } from "./createMediaPlaylistIR";

export interface IHLSRepresentationIndexInfos {
  endList: boolean;
  initSegmentInfo: IInitSegmentInfo | undefined;
  isVoD: boolean;
  mediaPlaylistURL: string;
  mediaSequence: number | undefined;
  segments: IHLSSegment[];
}

/**
 * Translate HLS way of representing a byte-range into the usual
 * [start, end] tuple.
 * @param {Array.<number | undefined>} hlsByteRange
 * @returns {Array.<number>}
 */
function translateHLSByteRange(
  hlsByteRange: [number, number | undefined],
): [number, number] {
  if (hlsByteRange[1] === undefined) {
    return [0, hlsByteRange[0]];
  }
  const start = hlsByteRange[1];
  return [start, start + hlsByteRange[0]];
}

/**
 * RepresentationIndex implementation for HLS Playlists.
 * @class HLSRepresentationIndex
 */
export default class HLSRepresentationIndex implements IRepresentationIndex {
  private _initSegmentInfo: IInitSegmentInfo | undefined;

  private _isFinished: boolean;

  private _timeline: ISegment[];

  private _isVoD: boolean;

  /**
   * @param {Object} infos
   */
  constructor(infos: IHLSRepresentationIndexInfos) {
    if (infos.initSegmentInfo !== undefined) {
      this._initSegmentInfo = {
        uri: resolveURL(infos.mediaPlaylistURL, infos.initSegmentInfo.uri),
        byteRange: infos.initSegmentInfo.byteRange,
      };
    }

    this._isFinished = infos.endList;
    this._isVoD = infos.isVoD;

    const timeline: ISegment[] = [];
    let mediaSequence = infos.mediaSequence ?? 0;

    let time: number = 0;
    for (let i = 0; i < infos.segments.length; i++) {
      const segment = infos.segments[i];
      if (segment.programDateTime !== undefined) {
        time = segment.programDateTime.getTime() / 1000;
      }
      const duration = segment.duration;
      const byteRange =
        segment.byteRange === undefined
          ? undefined
          : translateHLSByteRange(segment.byteRange);

      const uri = resolveURL(infos.mediaPlaylistURL, segment.uri);

      timeline.push({
        id: String(time),
        isInit: false,
        number: mediaSequence,
        time,
        duration,
        timescale: 1,
        range: byteRange,
        url: uri,
        privateInfos: {},
        end: time + duration,
        complete: true,
      });

      time += duration;
      mediaSequence++;

      // XXX TODO discontinuity
    }

    this._timeline = timeline;
  }

  isInitialized(): boolean {
    return true;
  }

  isStillAwaitingFutureSegments(): boolean {
    return false;
  }

  awaitSegmentBetween(): boolean {
    return false;
  }

  getEnd() {
    return this.getLastAvailablePosition();
  }

  initialize() {
    throw new Error("Cannot initialize HLS RepresentationIndex");
  }

  addPredictedSegments() {
    throw new Error("Cannot add predicted segments to HLS RepresentationIndex");
  }

  /**
   * @returns {Object | null}
   */
  getInitSegment(): ISegment | null {
    const initSegmentInfo = this._initSegmentInfo;
    if (initSegmentInfo === undefined) {
      return null;
    }
    const { uri, byteRange } = initSegmentInfo;
    return {
      id: "init",
      isInit: true,
      url: uri,
      time: 0,
      duration: 0,
      timescale: 1,
      range: byteRange !== undefined ? translateHLSByteRange(byteRange) : undefined,
      privateInfos: {},
      end: 0,
      complete: true,
    };
  }

  /**
   * @param {number} up
   * @param {number} duration
   * @returns {Array.<Object>}
   */
  getSegments(up: number, duration: number): ISegment[] {
    const from = up;
    const to = from + duration;
    for (let i = 0; i < this._timeline.length; i++) {
      const segment = this._timeline[i];
      if (segment.time >= to) {
        return [];
      } else if (segment.time + segment.duration > from) {
        let j = i + 1;
        while (j < this._timeline.length && to > this._timeline[j].time) {
          j++;
        }
        return this._timeline.slice(i, j);
      }
    }
    return [];
  }

  /**
   * Returns first position in index.
   * @returns {number | null}
   */
  getFirstAvailablePosition(): number | null {
    if (this._timeline.length === 0) {
      return null;
    }
    return this._timeline[0].time;
  }

  /**
   * Returns last position in index.
   * @returns {number | null}
   */
  getLastAvailablePosition(): number | null {
    if (this._timeline.length === 0) {
      return null;
    }
    const lastElement = this._timeline[this._timeline.length - 1];
    return lastElement.time + lastElement.duration;
  }

  /**
   * Returns false as a static file never need to be refreshed.
   * @returns {Boolean}
   */
  shouldRefresh(): false {
    return false;
  }

  /**
   * @returns {Number}
   */
  checkDiscontinuity(): -1 {
    // XXX TODO
    return -1;
  }

  /**
   * @returns {Boolean}
   */
  isSegmentStillAvailable(): true {
    // XXX TODO
    return true;
  }

  /**
   * @returns {Boolean}
   */
  canBeOutOfSyncError(error: unknown): boolean {
    if (this._isVoD) {
      return false;
    }
    return error instanceof NetworkError && error.isHttpError(404);
  }

  /**
   * @returns {Boolean}
   */
  isFinished(): boolean {
    return this._isFinished;
  }

  _addSegments(): void {
    log.warn("Tried add Segments to an HLS RepresentationIndex");
  }

  /**
   * @param {Object} newIndex
   */
  _replace(newIndex: IRepresentationIndex): void {
    if (!(newIndex instanceof HLSRepresentationIndex)) {
      throw new Error("Trying to replace an HLS index with a non-HLS one");
    }
    this._timeline = newIndex._timeline;
    this._initSegmentInfo = newIndex._initSegmentInfo;
    this._isFinished = newIndex._isFinished;
  }

  _update(newIndex: IRepresentationIndex): void {
    if (!(newIndex instanceof HLSRepresentationIndex)) {
      throw new Error("Trying to update an HLS index with a non-HLS one");
    }

    updateHLSTimeline(this._timeline, newIndex._timeline);

    this._initSegmentInfo = newIndex._initSegmentInfo;
    this._isFinished = newIndex._isFinished;
  }
}

/**
 * @param {Array.<Object>} oldTimeline
 * @param {Array.<Object>} newTimeline
 */
function updateHLSTimeline(oldTimeline: ISegment[], newTimeline: ISegment[]): void {
  if (oldTimeline.length === 0) {
    oldTimeline.splice(0, 0, ...newTimeline);
    return;
  }
  if (newTimeline.length === 0) {
    return;
  }
  const prevTimelineLength = oldTimeline.length;
  const oldLastElt = oldTimeline[prevTimelineLength - 1];

  const newStart = newTimeline[0].time;
  const oldEnd = oldLastElt.time + oldLastElt.duration;
  if (oldEnd < newStart) {
    throw new MediaError(
      "MANIFEST_UPDATE_ERROR",
      "Cannot perform partial update: not enough data",
    );
  }

  for (let i = prevTimelineLength - 1; i >= 0; i--) {
    const currStart = oldTimeline[i].time;
    if (currStart === newStart) {
      // replace that one and those after it
      oldTimeline.splice(i, prevTimelineLength - i, ...newTimeline);
      return;
    } else if (currStart < newStart) {
      // first to be before
      // the new Manifest overlaps a previous segment (weird). Remove the latter.
      log.warn("RepresentationIndex: Manifest update removed previous segments");
      oldTimeline.splice(i, prevTimelineLength - i, ...newTimeline);
    }
  }

  // if we got here, it means that every segments in the previous manifest are
  // after the new one. This is unusual.
  // Either the new one has more depth or it's an older one.
  const prevLastElt = oldTimeline[oldTimeline.length - 1];
  const newLastElt = newTimeline[newTimeline.length - 1];
  const prevLastTime = prevLastElt.time + prevLastElt.duration;
  const newLastTime = newLastElt.time + newLastElt.duration;
  if (prevLastTime >= newLastTime) {
    log.warn("RepresentationIndex: The new index is older than the previous one");
    return; // the old comes after
  }

  // the new one has more depth. full update
  log.warn('RepresentationIndex: The new index is "bigger" than the previous one');
  oldTimeline.splice(0, prevTimelineLength, ...newTimeline);
  return;
}
