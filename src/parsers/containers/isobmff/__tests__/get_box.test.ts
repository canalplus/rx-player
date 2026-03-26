import { describe, it, expect, vi, afterEach } from "vitest";
import assert from "../../../../utils/assert";
import { concat } from "../../../../utils/byte_parsing";
import {
  boxTypeToFourCC,
  getBox,
  getBoxContent,
  getBoxesContent,
  getBoxOffsets,
  getChildBox,
  getNextBoxOffsets,
  getUuidContent,
} from "../get_box";

const logWarn = vi.hoisted(() => vi.fn());
vi.mock("../../../../log", () => ({
  default: { warn: logWarn, debug: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

/**
 * Writes a 32-bit big-endian integer into `buf` at `offset`.
 */
function writeBe4(buf: Uint8Array, offset: number, value: number): void {
  buf[offset] = (value >>> 24) & 0xff;
  buf[offset + 1] = (value >>> 16) & 0xff;
  buf[offset + 2] = (value >>> 8) & 0xff;
  buf[offset + 3] = value & 0xff;
}

/**
 * Writes a 64-bit big-endian integer (as two 32-bit halves) into `buf` at
 * `offset`. Sufficient for box sizes well within the 32-bit range.
 */
function writeBe8(buf: Uint8Array, offset: number, hi: number, lo: number): void {
  writeBe4(buf, offset, hi);
  writeBe4(buf, offset + 4, lo);
}

/** Box name constants (big-endian ASCII) */
const MOOV = 0x6d6f6f76;
const MDAT = 0x6d646174;
const FTYP = 0x66747970;
const FREE = 0x66726565;
const UUID = 0x75756964;

/**
 * Builds a minimal ISOBMFF box:
 *   [4 bytes size][4 bytes name][...content]
 *
 * Total size = 8 + content.length
 */
function makeBox(name: number, content: Uint8Array = new Uint8Array(0)): Uint8Array {
  const size = 8 + content.length;
  const buf = new Uint8Array(size);
  writeBe4(buf, 0, size);
  writeBe4(buf, 4, name);
  buf.set(content, 8);
  return buf;
}

/**
 * Builds an extended-size (size === 1) box:
 *   [4 bytes: 1][4 bytes name][8 bytes largeSize][...content]
 *
 * Total size = 16 + content.length
 */
function makeLargeBox(name: number, content: Uint8Array = new Uint8Array(0)): Uint8Array {
  const totalSize = 16 + content.length;
  const buf = new Uint8Array(totalSize);
  writeBe4(buf, 0, 1); // size === 1 → extended
  writeBe4(buf, 4, name);
  writeBe8(buf, 8, 0, totalSize); // 64-bit size (fits in lower 32 bits)
  buf.set(content, 16);
  return buf;
}

/**
 * Builds a uuid box:
 *   [4 bytes size][4 bytes "uuid"][16 bytes uuid][...content]
 */
function makeUuidBox(
  id1: number,
  id2: number,
  id3: number,
  id4: number,
  content: Uint8Array = new Uint8Array(0),
): Uint8Array {
  const size = 8 + 16 + content.length;
  const buf = new Uint8Array(size);
  writeBe4(buf, 0, size);
  writeBe4(buf, 4, UUID);
  writeBe4(buf, 8, id1);
  writeBe4(buf, 12, id2);
  writeBe4(buf, 16, id3);
  writeBe4(buf, 20, id4);
  buf.set(content, 24);
  return buf;
}

describe("isobmff - boxTypeToFourCC", () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  it("should convert 'moov' integer to its fourCC string", () => {
    expect(boxTypeToFourCC(0x6d6f6f76)).toBe("moov");
  });

  it("should convert 'mdat' integer to its fourCC string", () => {
    expect(boxTypeToFourCC(0x6d646174)).toBe("mdat");
  });

  it("should convert 'pssh' integer to its fourCC string", () => {
    expect(boxTypeToFourCC(0x70737368)).toBe("pssh");
  });

  it("should correctly extract all four distinct bytes", () => {
    // 'A'=0x41  'B'=0x42  'C'=0x43  'D'=0x44
    expect(boxTypeToFourCC(0x41424344)).toBe("ABCD");
  });

  it("should return four identical characters when all bytes are the same", () => {
    expect(boxTypeToFourCC(0x61616161)).toBe("aaaa");
  });

  it("should return four null characters for 0", () => {
    expect(boxTypeToFourCC(0x00000000)).toBe("\0\0\0\0");
  });

  it("should handle the maximum 32-bit unsigned integer", () => {
    expect(boxTypeToFourCC(0xffffffff)).toBe("\xff\xff\xff\xff");
  });
});

describe("isobmff - getBoxOffsets", () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  it("should return null when the buffer is too small to hold any box header", () => {
    expect(getBoxOffsets(new Uint8Array(7), MOOV)).toBeNull();
  });

  it("should return null when the box name does not match", () => {
    const buf = makeBox(FTYP, new Uint8Array(4));
    expect(getBoxOffsets(buf, MOOV)).toBeNull();
  });

  it("should find a simple box and return correct offsets", () => {
    const content = new Uint8Array([1, 2, 3, 4]);
    const buf = makeBox(MOOV, content);
    // [0, 8, 12]  →  start=0, contentStart=8, end=12
    expect(getBoxOffsets(buf, MOOV)).toEqual([0, 8, 12]);
  });

  it("should skip earlier boxes and find the requested one", () => {
    const first = makeBox(FTYP, new Uint8Array(4));
    const second = makeBox(MOOV, new Uint8Array(8));
    const buf = concat(first, second);
    const result = getBoxOffsets(buf, MOOV);
    expect(result).not.toBeNull();
    assert(result !== null); // For TypeScript
    expect(result[0]).toBe(first.length);
    expect(result[2]).toBe(buf.length);
  });

  it("should handle an extended-size (size === 1) box", () => {
    const content = new Uint8Array([0xaa, 0xbb]);
    const buf = makeLargeBox(MOOV, content);
    // start=0, contentStart=16, end=18
    expect(getBoxOffsets(buf, MOOV)).toEqual([0, 16, 18]);
  });

  it("should treat size === 0 as extending to the end of the buffer", () => {
    const buf = makeBox(MOOV, new Uint8Array(4));
    writeBe4(buf, 0, 0); // overwrite size with 0
    const result = getBoxOffsets(buf, MOOV);
    expect(result).not.toBeNull();
    assert(result !== null); // For TypeScript
    expect(result[2]).toBe(buf.length);
  });

  it("should return null when an extended-size header cannot fit in the buffer", () => {
    // Write size=1 (extended) but only 12 bytes total — not enough for the 8-byte largeSize field
    const buf = new Uint8Array(12);
    writeBe4(buf, 0, 1);
    writeBe4(buf, 4, MOOV);
    expect(getBoxOffsets(buf, MOOV)).toBeNull();
  });

  it("should add 16 bytes to the content offset for a uuid box", () => {
    const content = new Uint8Array(4);
    const buf = makeUuidBox(0x01020304, 0x05060708, 0x090a0b0c, 0x0d0e0f10, content);
    const result = getBoxOffsets(buf, UUID);
    expect(result).not.toBeNull();
    assert(result !== null); // For TypeScript
    // uuid header: 8 (size+name) + 16 (uuid bytes) = content starts at 24
    expect(result[1]).toBe(24);
  });
});

describe("isobmff - getBoxContent", () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  it("should return null when the box is not present", () => {
    const buf = makeBox(FTYP, new Uint8Array(4));
    expect(getBoxContent(buf, MOOV)).toBeNull();
  });

  it("should return only the content bytes (excluding size and name)", () => {
    const content = new Uint8Array([10, 20, 30]);
    const buf = makeBox(MDAT, content);
    const result = getBoxContent(buf, MDAT);
    expect(result).not.toBeNull();
    assert(result !== null); // For TypeScript
    expect(Array.from(result)).toEqual([10, 20, 30]);
  });

  it("should return an empty Uint8Array for a box with no content", () => {
    const buf = makeBox(FTYP);
    const result = getBoxContent(buf, FTYP);
    expect(result).not.toBeNull();
    assert(result !== null); // For TypeScript
    expect(result.length).toBe(0);
  });
});

describe("isobmff - getBoxesContent", () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  it("should return an empty array when no matching box exists", () => {
    const buf = makeBox(FTYP, new Uint8Array(4));
    expect(getBoxesContent(buf, MOOV)).toEqual([]);
  });

  it("should return all occurrences of a repeated box, in order", () => {
    const first = makeBox(FREE, new Uint8Array([1]));
    const second = makeBox(FREE, new Uint8Array([2]));
    const third = makeBox(FREE, new Uint8Array([3]));
    const buf = concat(first, second, third);
    const result = getBoxesContent(buf, FREE);
    expect(result).toHaveLength(3);
    expect(Array.from(result[0])).toEqual([1]);
    expect(Array.from(result[1])).toEqual([2]);
    expect(Array.from(result[2])).toEqual([3]);
  });

  it("should return only the matching boxes and skip others", () => {
    const a = makeBox(FTYP, new Uint8Array([0xaa]));
    const b = makeBox(FREE, new Uint8Array([0xbb]));
    const c = makeBox(FTYP, new Uint8Array([0xcc]));
    const buf = concat(a, b, c);
    const result = getBoxesContent(buf, FTYP);
    expect(result).toHaveLength(2);
    expect(Array.from(result[0])).toEqual([0xaa]);
    expect(Array.from(result[1])).toEqual([0xcc]);
  });
});

describe("isobmff - getBox", () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  it("should return null when the box is not found", () => {
    const buf = makeBox(FTYP, new Uint8Array(4));
    expect(getBox(buf, MOOV)).toBeNull();
  });

  it("should return the full box bytes — size + name + content", () => {
    const content = new Uint8Array([0xde, 0xad]);
    const fullBox = makeBox(MDAT, content);
    const result = getBox(fullBox, MDAT);
    expect(result).not.toBeNull();
    assert(result !== null); // For TypeScript
    expect(Array.from(result)).toEqual(Array.from(fullBox));
  });

  it("should return only the matching box when preceded by another box", () => {
    const before = makeBox(FTYP, new Uint8Array(4));
    const target = makeBox(MOOV, new Uint8Array([0xff]));
    const buf = concat(before, target);
    const result = getBox(buf, MOOV);
    expect(result).not.toBeNull();
    assert(result !== null); // For TypeScript
    expect(Array.from(result)).toEqual(Array.from(target));
  });
});

describe("isobmff - getChildBox", () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  it("should return null when an empty childNames array is provided and the buffer is non-empty", () => {
    // With no children to traverse, the loop never executes and currBox is
    // returned as-is. Verify the returned reference equals the input.
    const buf = makeBox(MOOV, new Uint8Array(4));
    const result = getChildBox(buf, []);
    assert(result !== null);
    expect(Array.from(result)).toEqual(Array.from(buf));
  });

  it("should return null when the first child is not found", () => {
    const buf = makeBox(FTYP, new Uint8Array(4));
    expect(getChildBox(buf, [MOOV])).toBeNull();
  });

  it("should return null when an intermediate child is not found", () => {
    // moov → ftyp exists, but moov → ftyp → mdat does not
    const innerContent = makeBox(FTYP, new Uint8Array(2));
    const outer = makeBox(MOOV, innerContent);
    expect(getChildBox(outer, [MOOV, FTYP, MDAT])).toBeNull();
  });

  it("should traverse a chain of nested boxes and return the innermost content", () => {
    const payload = new Uint8Array([0x42]);
    const innermost = makeBox(MDAT, payload);
    const middle = makeBox(FTYP, innermost);
    const outer = makeBox(MOOV, middle);
    const result = getChildBox(outer, [MOOV, FTYP, MDAT]);
    expect(result).not.toBeNull();
    assert(result !== null); // For TypeScript
    expect(Array.from(result)).toEqual([0x42]);
  });
});

describe("isobmff - getNextBoxOffsets", () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  it("should return null and warn when the buffer is shorter than 8 bytes", () => {
    const result = getNextBoxOffsets(new Uint8Array(4));
    expect(result).toBeNull();
    expect(logWarn).toHaveBeenCalledOnce();
  });

  it("should return correct offsets for a simple box", () => {
    const content = new Uint8Array([1, 2]);
    const buf = makeBox(MOOV, content);
    // start=0, contentStart=8, end=10
    expect(getNextBoxOffsets(buf)).toEqual([0, 8, 10]);
  });

  it("should handle an extended-size box correctly", () => {
    const content = new Uint8Array([0xab]);
    const buf = makeLargeBox(FTYP, content);
    expect(getNextBoxOffsets(buf)).toEqual([0, 16, 17]);
  });

  it("should treat size === 0 as extending to the end of the buffer", () => {
    const buf = makeBox(MOOV, new Uint8Array(6));
    writeBe4(buf, 0, 0);
    const result = getNextBoxOffsets(buf);
    expect(result).not.toBeNull();
    assert(result !== null); // For TypeScript
    expect(result[2]).toBe(buf.length);
  });

  it("should return null and warn when an extended-size header cannot fit in the buffer", () => {
    const buf = new Uint8Array(12);
    writeBe4(buf, 0, 1);
    writeBe4(buf, 4, MOOV);
    const result = getNextBoxOffsets(buf);
    expect(result).toBeNull();
    expect(logWarn).toHaveBeenCalledOnce();
  });

  it("should add 16 bytes to the content offset for a uuid box", () => {
    const content = new Uint8Array(2);
    const buf = makeUuidBox(0x01020304, 0x05060708, 0x090a0b0c, 0x0d0e0f10, content);
    const result = getNextBoxOffsets(buf);
    expect(result).not.toBeNull();
    assert(result !== null); // For TypeScript
    expect(result[1]).toBe(24);
  });

  it("should always return 0 as the first element (start byte)", () => {
    const buf = makeBox(FREE, new Uint8Array(4));
    const result = getNextBoxOffsets(buf);
    assert(result !== null);
    expect(result[0]).toBe(0);
  });
});

describe("isobmff - getUuidContent", () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  const ID1 = 0x01020304;
  const ID2 = 0x05060708;
  const ID3 = 0x090a0b0c;
  const ID4 = 0x0d0e0f10;

  it("should return undefined when no uuid box is present", () => {
    const buf = makeBox(MOOV, new Uint8Array(4));
    expect(getUuidContent(buf, ID1, ID2, ID3, ID4)).toBeUndefined();
  });

  it("should return undefined when the uuid identifiers do not match", () => {
    const buf = makeUuidBox(0xdeadbeef, ID2, ID3, ID4, new Uint8Array(2));
    expect(getUuidContent(buf, ID1, ID2, ID3, ID4)).toBeUndefined();
  });

  it("should return the content bytes when the uuid matches exactly", () => {
    const payload = new Uint8Array([0xca, 0xfe]);
    const buf = makeUuidBox(ID1, ID2, ID3, ID4, payload);
    const result = getUuidContent(buf, ID1, ID2, ID3, ID4);
    expect(result).not.toBeUndefined();
    assert(result !== undefined); // For TypeScript
    expect(Array.from(result)).toEqual([0xca, 0xfe]);
  });

  it("should skip non-uuid boxes and find the matching uuid box", () => {
    const payload = new Uint8Array([0xff]);
    const nonUuid = makeBox(MOOV, new Uint8Array(4));
    const uuidBox = makeUuidBox(ID1, ID2, ID3, ID4, payload);
    const buf = concat(nonUuid, uuidBox);
    const result = getUuidContent(buf, ID1, ID2, ID3, ID4);
    expect(result).not.toBeUndefined();
    assert(result !== undefined); // For TypeScript
    expect(Array.from(result)).toEqual([0xff]);
  });

  it("should return undefined when uuid header is present but the 16-byte id cannot fit in the buffer", () => {
    // Build a box that claims to be uuid but is too short to hold its 16-byte identifier
    const buf = new Uint8Array(16);
    writeBe4(buf, 0, 16);
    writeBe4(buf, 4, UUID);
    // Only 8 bytes remain — not enough for the full 16-byte uuid identifier
    expect(getUuidContent(buf, ID1, ID2, ID3, ID4)).toBeUndefined();
  });

  it("should handle a size === 0 uuid box that extends to end of buffer", () => {
    const payload = new Uint8Array([0x11, 0x22]);
    const uuidBox = makeUuidBox(ID1, ID2, ID3, ID4, payload);
    writeBe4(uuidBox, 0, 0); // size = 0 → extends to end
    const result = getUuidContent(uuidBox, ID1, ID2, ID3, ID4);
    expect(result).not.toBeUndefined();
    assert(result !== undefined); // For TypeScript
    expect(Array.from(result)).toEqual([0x11, 0x22]);
  });
});
