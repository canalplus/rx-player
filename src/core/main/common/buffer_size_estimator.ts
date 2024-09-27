import log from "../../../log";
import type { ITrackType } from "../../../public_types";
import getMonotonicTimeStamp from "../../../utils/monotonic_timestamp";
import type { IRange } from "../../../utils/ranges";
import type SharedReference from "../../../utils/reference";
import type SegmentSinksStore from "../../segment_sinks";

export default class BufferSizeEstimator {
  private _segmentSinkStore: SegmentSinksStore;
  private _wantedBufferAhead: SharedReference<number>;
  private _maxVideoBufferSize: SharedReference<number>;
  private _lockUntil: number | null;
  private _removing: boolean;
  private _lastMaxVideoBufferSizeLimits: number[];

  constructor(
    segmentSinksStore: SegmentSinksStore,
    localWantedBufferAhead: SharedReference<number>,
    localMaxVideoBufferSize: SharedReference<number>,
  ) {
    this._segmentSinkStore = segmentSinksStore;
    this._wantedBufferAhead = localWantedBufferAhead;
    this._maxVideoBufferSize = localMaxVideoBufferSize;
    this._lockUntil = null;
    this._removing = false;
    this._lastMaxVideoBufferSizeLimits = [];
  }

  async onMediaObservation(
    trackType: ITrackType,
    position: number,
    buffered: IRange[],
    gced: IRange[],
  ) {
    if (trackType === "text") {
      return;
    }
    const sinkStatus = this._segmentSinkStore.getStatus(trackType);
    if (sinkStatus.type !== "initialized") {
      log.warn("BSE: Ticking for an unknown sink");
      return;
    }

    const now = getMonotonicTimeStamp();
    const segmentSink = sinkStatus.value;
    const baseWantedBufferAhead = this._wantedBufferAhead.getValue();

    const inventory = segmentSink.getLastKnownInventory();
    let bufferSize: number | undefined;
    if (trackType === "video") {
      bufferSize = 0;
      for (const item of inventory) {
        if (item.chunkSize === undefined || bufferSize === undefined) {
          log.warn("BSE: A chunk has an undefined size. Aborting.");
          bufferSize = undefined;
          break;
        }
        bufferSize += item.chunkSize;
      }
    }
    log.debug("BSE: Current buffer size estimate:", bufferSize);
    if (bufferSize === undefined) {
      return;
    }

    // if (
    //   !this._removing &&
    //   gced.length === 0 &&
    //   buffered.length > 0 &&
    //   buffered[buffered.length - 1].end - position > baseWantedBufferAhead - 1 &&
    //   position > 10 &&
    //   position - buffered[0].start > baseWantedBufferAhead
    // ) {
    //   if (this._lockUntil !== null) {
    //     if (this._lockUntil <= now) {
    //       log.warn("BSE: Lock time ended");
    //       if (trackType === "video") {
    //         this._maxVideoBufferSize.setValue(Infinity);
    //       }
    //       this._lockUntil = null;
    //     }
    //     return;
    //   }
    //
    //   const sinks = [segmentSink];
    //   const otherTrackType = trackType === "video" ? "audio" : "video";
    //   const otherSinkStatus = this._segmentSinkStore.getStatus(otherTrackType);
    //   if (otherSinkStatus.type === "initialized") {
    //     sinks.push(otherSinkStatus.value);
    //   }
    //   log.warn("BSE: Removing buffer behind", position - 10);
    //   this._removing = true;
    //   await Promise.all([
    //     ...sinks.map((s) => s.removeBuffer(0, position - 10)),
    //     ...sinks.map((s) =>
    //       s.removeBuffer(position + baseWantedBufferAhead + 20, Number.MAX_VALUE),
    //     ),
    //   ]);
    //   this._removing = false;
    //   const newWantedBufferAhead = baseWantedBufferAhead + 6;
    //   log.warn(
    //     "BSE: We have a big buffer behind raising `wantedBufferAhead`.",
    //     baseWantedBufferAhead,
    //     newWantedBufferAhead,
    //   );
    //   this._wantedBufferAhead.setValue(newWantedBufferAhead);
    // }

    if (gced.length > 0) {
      console.warn("BSE: GC detected", bufferSize, JSON.stringify(gced));
      const newLock = now + 10000;
      if (
        this._lockUntil === null ||
        this._lockUntil === Infinity ||
        this._lockUntil < newLock
      ) {
        this._lockUntil = newLock;
      }

      const bufferedSize = buffered.length > 0 ? buffered[0].end - buffered[0].start : 0;

      if (position - 10 > 0 && buffered.length > 0 && position - buffered[0].start > 10) {
        const sinks = [segmentSink];
        const otherTrackType = trackType === "video" ? "audio" : "video";
        const otherSinkStatus = this._segmentSinkStore.getStatus(otherTrackType);
        if (otherSinkStatus.type === "initialized") {
          sinks.push(otherSinkStatus.value);
        }
        console.warn("BSE: Removing buffer behind", position - 10);
        this._removing = true;
        await Promise.all([
          ...sinks.map((s) => s.removeBuffer(0, position - 10)),
          ...sinks.map((s) =>
            s.removeBuffer(position + baseWantedBufferAhead + 20, Number.MAX_VALUE),
          ),
        ]);
        this._removing = false;
      }

      if (
        bufferSize !== undefined &&
        trackType === "video" &&
        this._maxVideoBufferSize.getValue() > bufferSize
      ) {
        if (this._lastMaxVideoBufferSizeLimits.length > 0) {
          const prevBufferSize =
            this._lastMaxVideoBufferSizeLimits[
              this._lastMaxVideoBufferSizeLimits.length - 1
            ];
          const ratio = bufferSize / prevBufferSize;

          if (ratio < 1.2 && ratio > 0.83) {
            console.debug(
              "BSE: Sensibly same `maxVideoBufferSize` limit",
              bufferSize,
              prevBufferSize,
              ratio,
            );
            this._lastMaxVideoBufferSizeLimits.push(bufferSize);
          } else {
            console.debug(
              "BSE: Different `maxVideoBufferSize` limit",
              bufferSize,
              prevBufferSize,
              ratio,
            );
            this._lastMaxVideoBufferSizeLimits = [bufferSize];
          }
        } else {
          this._lastMaxVideoBufferSizeLimits = [bufferSize];
        }

        if (this._lastMaxVideoBufferSizeLimits.length >= 3) {
          bufferSize = Math.min(...this._lastMaxVideoBufferSizeLimits) * 0.75;
          log.warn("BSE: Locking minimum maxVideoBufferSize long term", bufferSize);
          this._lockUntil = Infinity;
          const toRemove = this._lastMaxVideoBufferSizeLimits.length - 10;
          if (toRemove > 0) {
            this._lastMaxVideoBufferSizeLimits.splice(0, toRemove);
          }
        } else {
          console.warn("BSE: Locking maxVideoBufferSize: ", bufferSize);
        }
        this._maxVideoBufferSize.setValue(bufferSize);
      }

      // const newWantedBufferAhead = Math.max(5, baseWantedBufferAhead - 8);
      console.warn(
        "BSE: Locking wantedBufferAhead: ",
        baseWantedBufferAhead,
        bufferedSize,
      );
      this._wantedBufferAhead.setValue(bufferedSize);
    }
  }
}
