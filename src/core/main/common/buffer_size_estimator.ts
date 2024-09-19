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
    if (bufferSize === undefined) {
      return;
    }

    if (
      !this._removing &&
      gced.length === 0 &&
      buffered.length > 0 &&
      buffered[buffered.length - 1].end - position > baseWantedBufferAhead - 1 &&
      position > 10 &&
      position - buffered[0].start > baseWantedBufferAhead
    ) {
      if (this._lockUntil !== null) {
        if (this._lockUntil <= now) {
          log.warn("BSE: Lock time ended");
          if (trackType === "video") {
            this._maxVideoBufferSize.setValue(Infinity);
          }
          this._lockUntil = null;
        }
        return;
      }

      const sinks = [segmentSink];
      const otherTrackType = trackType === "video" ? "audio" : "video";
      const otherSinkStatus = this._segmentSinkStore.getStatus(otherTrackType);
      if (otherSinkStatus.type === "initialized") {
        sinks.push(otherSinkStatus.value);
      }
      log.warn("BSE: Removing buffer behind", position - 10);
      this._removing = true;
      await Promise.all([
        ...sinks.map((s) => s.removeBuffer(0, position - 10)),
        ...sinks.map((s) =>
          s.removeBuffer(position + baseWantedBufferAhead + 20, Number.MAX_VALUE),
        ),
      ]);
      this._removing = false;
      const newWantedBufferAhead = baseWantedBufferAhead + 6;
      log.warn(
        "BSE: We have a big buffer behind raising `wantedBufferAhead`.",
        baseWantedBufferAhead,
        newWantedBufferAhead,
      );
      this._wantedBufferAhead.setValue(newWantedBufferAhead);
    }

    if (gced.length > 0) {
      log.warn("BSE: GC detected", bufferSize, JSON.stringify(gced));
      this._lockUntil = now + 10000;

      if (position - 10 > 0 && buffered.length > 0 && position - buffered[0].start > 10) {
        const sinks = [segmentSink];
        const otherTrackType = trackType === "video" ? "audio" : "video";
        const otherSinkStatus = this._segmentSinkStore.getStatus(otherTrackType);
        if (otherSinkStatus.type === "initialized") {
          sinks.push(otherSinkStatus.value);
        }
        log.warn("BSE: Removing buffer behind", position - 10);
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
        log.warn("BSE: Locking maxVideoBufferSize: ", bufferSize);
        this._maxVideoBufferSize.setValue(bufferSize);
      }
      const newWantedBufferAhead = Math.max(5, baseWantedBufferAhead - 7);
      if (newWantedBufferAhead < baseWantedBufferAhead) {
        log.warn(
          "BSE: Lowering wantedBufferAhead: ",
          baseWantedBufferAhead,
          newWantedBufferAhead,
        );
        this._wantedBufferAhead.setValue(newWantedBufferAhead);
      }
    }
  }
}
