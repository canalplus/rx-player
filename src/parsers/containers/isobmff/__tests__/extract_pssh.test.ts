import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { concat } from "../../../../utils/byte_parsing.ts";
import extractPssh, { getPsshSystemID } from "../extract_pssh.ts";

const { mockCanPatchOutPsshBox, mockLog } = vi.hoisted(() => {
  return {
    mockCanPatchOutPsshBox: vi.fn(() => false),
    mockLog: {
      warn: vi.fn(),
      info: vi.fn(),
      debug: vi.fn(),
      log: vi.fn(),
      error: vi.fn(),
    },
  };
});

vi.mock("../../../../compat/can_patch_out_pssh", () => ({
  default: mockCanPatchOutPsshBox,
}));

vi.mock("../../../../log", () => ({
  default: mockLog,
}));

/** Build a minimal moov box wrapping `innerBytes`. */
function buildMoovBox(innerBytes: Uint8Array<ArrayBuffer>): Uint8Array<ArrayBuffer> {
  const size = 8 + innerBytes.length;
  const buf = new Uint8Array(size);
  const view = new DataView(buf.buffer);
  view.setUint32(0, size, false);
  buf[4] = 0x6d;
  buf[5] = 0x6f;
  buf[6] = 0x6f;
  buf[7] = 0x76; // "moov"
  buf.set(innerBytes, 8);
  return buf;
}

/**
 * Build a pssh box.
 *
 * Layout (after size + name):
 *   1 byte  version
 *   3 bytes flags
 *  16 bytes systemId
 *   N bytes extra data
 */
function buildPsshBox(
  systemId: Uint8Array<ArrayBuffer>,
  version = 0,
  extraData: Uint8Array<ArrayBuffer> = new Uint8Array(0),
): Uint8Array<ArrayBuffer> {
  // 8 (size+name) + 1 (version) + 3 (flags) + 16 (systemId) + extraData
  const size = 8 + 1 + 3 + 16 + extraData.length;
  const buf = new Uint8Array(size);
  const view = new DataView(buf.buffer);
  view.setUint32(0, size, false);
  buf[4] = 0x70;
  buf[5] = 0x73;
  buf[6] = 0x73;
  buf[7] = 0x68; // "pssh"
  buf[8] = version; // version (bytes 0 of version+flags)
  // flags stay 0x000000
  buf.set(systemId, 12); // offset 8+4 = 12
  buf.set(extraData, 28);
  return buf;
}

const SYSTEM_ID_A = new Uint8Array([
  0x10, 0x77, 0xef, 0xec, 0xc0, 0xb2, 0x4d, 0x02, 0xac, 0xe3, 0x3c, 0x1e, 0x52, 0xe2,
  0xfb, 0x4b,
]);
const SYSTEM_ID_B = new Uint8Array([
  0xed, 0xef, 0x8b, 0xa9, 0x79, 0xd6, 0x4a, 0xce, 0xa3, 0xc8, 0x27, 0xdc, 0xd5, 0x1d,
  0x21, 0xed,
]);

const systemIdAHex = Array.from(SYSTEM_ID_A)
  .map((b) => b.toString(16).padStart(2, "0"))
  .join("");
const systemIdBHex = Array.from(SYSTEM_ID_B)
  .map((b) => b.toString(16).padStart(2, "0"))
  .join("");

describe("extractPssh", () => {
  beforeEach(() => {
    mockCanPatchOutPsshBox.mockReturnValue(true);
  });
  afterEach(() => {
    vi.resetAllMocks();
  });

  it("returns [] when there is no moov box", () => {
    const data = new Uint8Array(32); // no moov, only `0`
    expect(extractPssh(data)).toEqual([]);
  });

  it("returns [] when moov contains no pssh box", () => {
    // An empty moov (just the 8-byte header, no inner boxes)
    const data = buildMoovBox(new Uint8Array(0));
    expect(extractPssh(data)).toEqual([]);
  });

  it("extracts a single pssh box", () => {
    const pssh = buildPsshBox(SYSTEM_ID_A);
    const data = buildMoovBox(pssh);
    const result = extractPssh(data);
    expect(result).toHaveLength(1);
    expect(result[0].systemId).toBe(systemIdAHex);
  });

  it("extracts multiple pssh boxes in order", () => {
    const psshA = buildPsshBox(SYSTEM_ID_A);
    const psshB = buildPsshBox(SYSTEM_ID_B);
    const data = buildMoovBox(concat(psshA, psshB));
    const result = extractPssh(data);
    expect(result).toHaveLength(2);
    expect(result[0].systemId).toBe(systemIdAHex);
    expect(result[1].systemId).toBe(systemIdBHex);
  });

  it("skips a pssh whose systemId cannot be parsed and keeps going", () => {
    // A pssh with version > 1 triggers the 'un-handled PSSH version' warn path,
    // so getPsshSystemID returns undefined and the box is omitted.
    const psshBad = buildPsshBox(SYSTEM_ID_A, 2 /* unsupported version */);
    const psshGood = buildPsshBox(SYSTEM_ID_B);
    const data = buildMoovBox(concat(psshBad, psshGood));
    const result = extractPssh(data);
    expect(result).toHaveLength(1);
    expect(result[0].systemId).toBe(systemIdBHex);
    expect(mockLog.warn).toHaveBeenCalledWith("isobmff", "un-handled PSSH version");
  });

  it("patches out pssh bytes when canPatchOutPsshBox returns true", () => {
    mockCanPatchOutPsshBox.mockReturnValue(true);
    const pssh = buildPsshBox(SYSTEM_ID_A);
    const moov = buildMoovBox(pssh);
    // The pssh box starts at offset 8 inside moov content (right after moov header).
    // After patching, bytes 4–7 of the pssh box should be "free" (0x66 0x72 0x65 0x65).
    extractPssh(moov);
    // moov content starts at offset 8 of the full segment.
    // pssh name is at moov_content[4..7] = segment[12..15]
    expect(moov[12]).toBe(0x66); // 'f'
    expect(moov[13]).toBe(0x72); // 'r'
    expect(moov[14]).toBe(0x65); // 'e'
    expect(moov[15]).toBe(0x65); // 'e'
  });

  it("does not patch bytes when canPatchOutPsshBox returns false", () => {
    mockCanPatchOutPsshBox.mockReturnValue(false);
    const pssh = buildPsshBox(SYSTEM_ID_A);
    const originalNameByte1 = pssh[4]; // should be 0x70 ('p')
    const originalNameByte2 = pssh[5]; // 's'
    const originalNameByte3 = pssh[6]; // 's'
    const originalNameByte4 = pssh[7]; // 'h'
    const moov = buildMoovBox(pssh);
    extractPssh(moov);
    expect(moov[12]).toBe(originalNameByte1);
    expect(moov[13]).toBe(originalNameByte2);
    expect(moov[14]).toBe(originalNameByte3);
    expect(moov[15]).toBe(originalNameByte4);
  });
});

describe("getPsshSystemID", () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  it("parses a valid version-0 pssh and returns hex systemId", () => {
    const pssh = buildPsshBox(SYSTEM_ID_A);
    // initialDataOffset is the offset right after size (4) + name (4) = 8
    const result = getPsshSystemID(pssh, 8);
    expect(result).toBe(systemIdAHex);
  });

  it("parses a valid version-1 pssh", () => {
    const pssh = buildPsshBox(SYSTEM_ID_B, 1);
    const result = getPsshSystemID(pssh, 8);
    expect(result).toBe(systemIdBHex);
  });

  it("returns undefined and warns for version > 1", () => {
    const pssh = buildPsshBox(SYSTEM_ID_A, 2);
    const result = getPsshSystemID(pssh, 8);
    expect(result).toBeUndefined();
    expect(mockLog.warn).toHaveBeenCalledWith("isobmff", "un-handled PSSH version");
  });

  it("returns undefined when buffer is too short to contain a full systemId", () => {
    // Build a buffer that's big enough for the header (version + flags = 4 bytes)
    // but lacks the 16-byte systemId.
    const buf = new Uint8Array(8 + 4 + 10); // only 10 bytes where 16 are needed
    const result = getPsshSystemID(buf, 8);
    expect(result).toBeUndefined();
    expect(mockLog.warn).not.toHaveBeenCalled();
  });
});
