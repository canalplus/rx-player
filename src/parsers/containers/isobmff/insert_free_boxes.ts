import logger from "../../../log";

/**
 * Inserts 3 `free` boxes after the `mvhd` box inside `moov`,
 * mimicking the position of PlayReady + Widevine + Nagra pssh boxes.
 *
 * Safe for MSE init segments (moov-only, no mdat → no stco/co64 to fix).
 *
 * @param {Uint8Array} bytes - The init segment buffer
 * @param {number[]} sizes - The box sizes in bytes (default: [300, 300, 300])
 * @returns {Uint8Array} - New buffer with free boxes injected
 */
export function injectFreeBoxes(
  bytes: Uint8Array<ArrayBuffer>,
  sizes: number[] = [300, 300, 300],
): Uint8Array<ArrayBuffer> {
  logger.warn("isobmff", "adding free boxes");

  // 1. Locate `moov`
  const moov = findBox(bytes, 0, bytes.length, 0x6d6f6f76 /* 'moov' */);
  if (moov === null) {
    throw new Error("No moov box found");
  }

  // 2. Locate `mvhd` inside `moov`
  const mvhd = findBox(bytes, moov.dataStart, moov.end, 0x6d766864 /* 'mvhd' */);
  if (mvhd === null) {
    throw new Error("No mvhd box found inside moov");
  }

  // Insertion point: immediately after mvhd
  const insertAt = mvhd.end;

  // 3. Build the 3 `free` boxes ─
  const freeBoxes = buildFreeBoxes(sizes);
  const totalInserted = freeBoxes.byteLength;

  // 4. Assemble new buffer ─
  const newBuffer = new ArrayBuffer(bytes.byteLength + totalInserted);
  const newBytes = new Uint8Array(newBuffer);
  const newView = new DataView(newBuffer);

  // Before insertion point
  newBytes.set(bytes.subarray(0, insertAt), 0);
  // Injected free boxes
  newBytes.set(new Uint8Array(freeBoxes), insertAt);
  // Rest of original buffer
  newBytes.set(bytes.subarray(insertAt), insertAt + totalInserted);

  //  5. Patch `moov` size ─
  const newMoovSize = moov.size + totalInserted;
  newView.setUint32(moov.start, newMoovSize, false /* big-endian */);

  return newBytes;
}

/**
 * Finds the first box with the given 4CC type within [rangeStart, rangeEnd).
 * Returns { start, dataStart, end, size } or null.
 */
function findBox(
  bytes: Uint8Array<ArrayBuffer>,
  rangeStart: number,
  rangeEnd: number,
  type: number,
): {
  start: number;
  dataStart: number;
  end: number;
  size: number;
} | null {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let offset = rangeStart;

  while (offset + 8 <= rangeEnd) {
    const size = view.getUint32(offset, false);
    const boxType = view.getUint32(offset + 4, false);

    if (size < 8) {
      throw new Error(`Invalid box size ${size} at offset ${offset}`);
    }

    if (boxType === type) {
      return {
        start: offset,
        dataStart: offset + 8,
        end: offset + size,
        size,
      };
    }

    offset += size;
  }

  return null;
}

/**
 * Builds N `free` boxes concatenated into a single ArrayBuffer.
 * Each box is [4-byte size][4-byte 'free'][zero-padded payload].
 * Minimum valid size is 8 bytes (header only, no payload).
 */
function buildFreeBoxes(sizes: number[]) {
  const FREE = 0x66726565; // 'free'
  const total = sizes.reduce((a, b) => a + b, 0);
  const buffer = new ArrayBuffer(total);
  const view = new DataView(buffer);
  let offset = 0;

  for (const size of sizes) {
    if (size < 8) {
      throw new Error(`free box size must be >= 8, got ${size}`);
    }
    view.setUint32(offset, size, false); // box size
    view.setUint32(offset + 4, FREE, false); // box type 'free'
    // payload bytes are already zero-filled by ArrayBuffer
    offset += size;
    logger.warn("isobmff", "added free box of size " + size);
  }

  return buffer;
}
