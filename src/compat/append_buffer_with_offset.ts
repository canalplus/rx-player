import log from "../log";
import { getMDHDTimescale, hasInitSegment } from "../parsers/containers/isobmff";
import {
  getTrackFragmentDecodeTime,
  setTrackFragmentDecodeTime,
} from "../parsers/containers/isobmff/utils";
import canRelyOnMseTimestampOffset from "./can_rely_on_mse_timestamp_offset";

const sourceBufferInitTimescale = new WeakMap<SourceBuffer, number | undefined>();

/**
 * Append media or initialization segment (represented by `data`) to the given
 * SourceBuffer (represented by `sourceBuffer`), with the given
 * `timestampOffset` in seconds.
 *
 * Setting `timestampOffset` to `undefined`, means that we won't try to update
 * one that may already (or may not) be present.
 *
 * @param {SourceBuffer} sourceBuffer
 * @param {BufferSource} data
 * @param {number|undefined} timestampOffset
 */
export default function appendBufferWithOffset(
  sourceBuffer: SourceBuffer,
  data: BufferSource,
  timestampOffset: number | undefined,
): void {
  if (!canRelyOnMseTimestampOffset) {
    return appendBufferWithoutTimestampOffsetCapabilities(
      sourceBuffer,
      data,
      timestampOffset,
    );
  }
  return appendBufferWithTimestampOffsetCapabilities(sourceBuffer, data, timestampOffset);
}

/**
 * Append media or initialization segment (represented by `data`) to the given
 * SourceBuffer (represented by `sourceBuffer`), with the given
 * `timestampOffset` in seconds for devices where the MSE `timestampOffset`
 * attribute **CAN** be used.
 *
 * @param {SourceBuffer} sourceBuffer
 * @param {BufferSource} data
 * @param {number|undefined} timestampOffset
 */
function appendBufferWithTimestampOffsetCapabilities(
  sourceBuffer: SourceBuffer,
  data: BufferSource,
  timestampOffset: number | undefined,
): void {
  if (timestampOffset !== undefined && sourceBuffer.timestampOffset !== timestampOffset) {
    const newTimestampOffset = timestampOffset;
    log.debug(
      "SBI: updating timestampOffset",
      sourceBuffer.timestampOffset,
      newTimestampOffset,
    );
    sourceBuffer.timestampOffset = newTimestampOffset;
  }

  sourceBuffer.appendBuffer(data);
}

/**
 * Append media or initialization segment (represented by `data`) to the given
 * SourceBuffer (represented by `sourceBuffer`), with the given
 * `timestampOffset` in seconds for devices where the MSE `timestampOffset`
 * attribute **CANNOT** be used.
 *
 * @param {SourceBuffer} sourceBuffer
 * @param {BufferSource} data
 * @param {number|undefined} timestampOffset
 */
function appendBufferWithoutTimestampOffsetCapabilities(
  sourceBuffer: SourceBuffer,
  data: BufferSource,
  timestampOffset: number | undefined,
): void {
  const dataU8 = toUint8Array(data);

  // TODO also for WebM
  const isMp4InitSegment = hasInitSegment(dataU8);
  if (isMp4InitSegment) {
    const mdhdTimeScale = getMDHDTimescale(dataU8);
    // TODO We're not resetting it when the SourceBuffer's `abort method is
    // called, yet the browser IS forgetting about that init segment in that
    // case, we may want to properly account for that.
    //
    // However, this should in all scenarios I can think of not be an issue
    // because initialization segments should have to be pushed before mp4 media
    // segments, so there's few actual chance that this value isn't synchronized
    // with what it should be.
    sourceBufferInitTimescale.set(sourceBuffer, mdhdTimeScale);
  }

  if (timestampOffset !== 0 && timestampOffset !== undefined) {
    const initTimescale = sourceBufferInitTimescale.get(sourceBuffer);
    if (initTimescale === undefined) {
      log.warn("Compat: not able to mutate decode time due to unknown timescale");
      return appendBufferWithTimestampOffsetCapabilities(
        sourceBuffer,
        data,
        timestampOffset,
      );
    }
    const oldTrackFragmentDecodeTime = getTrackFragmentDecodeTime(dataU8);
    if (oldTrackFragmentDecodeTime === undefined) {
      log.warn("Compat: not able to mutate decode time due to not found tfdt");
      return appendBufferWithTimestampOffsetCapabilities(
        sourceBuffer,
        data,
        timestampOffset,
      );
    }

    const timescaledOffset = initTimescale * timestampOffset;
    const newTrackFragmentDecodeTime = oldTrackFragmentDecodeTime + timescaledOffset;
    log.debug(
      "Compat: Trying to update decode time",
      oldTrackFragmentDecodeTime,
      newTrackFragmentDecodeTime,
    );
    if (!setTrackFragmentDecodeTime(dataU8, newTrackFragmentDecodeTime)) {
      log.warn("Compat: not able to mutate decode time due to another reason");
      return appendBufferWithTimestampOffsetCapabilities(
        sourceBuffer,
        data,
        timestampOffset,
      );
    }
  }
  sourceBuffer.appendBuffer(dataU8);
}

/**
 * Convert unknown BufferSource type value into an Uint8Array.
 * @param {BufferSource} data
 * @returns {Uint8Array}
 */
function toUint8Array(data: BufferSource): Uint8Array {
  if (data instanceof Uint8Array) {
    return data;
  } else if (data instanceof ArrayBuffer) {
    return new Uint8Array(data);
  } else {
    return new Uint8Array(data.buffer);
  }
}
