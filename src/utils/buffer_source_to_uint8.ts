/**
 * Convert a vague "BufferSource" binary data into a more exploitable and known
 * `Uint8Array`.
 * @param {BufferSource} bs
 * @returns {Uint8Array}
 */
export default function bufferSourceToUint8(bs: BufferSource): Uint8Array {
  if (bs instanceof Uint8Array) {
    return bs;
  } else if (bs instanceof ArrayBuffer) {
    return new Uint8Array(bs);
  }
  return new Uint8Array(bs.buffer);
}
