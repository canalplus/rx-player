import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { bytesToBase64, base64ToBytes } from "../base64";

/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/unbound-method */

const { mockWarn } = vi.hoisted(() => {
  return { mockWarn: vi.fn() };
});

vi.mock("../../log", () => ({
  default: {
    warn: mockWarn,
  },
}));

function removeNativeBytesToBase64() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delete (Uint8Array.prototype as any).toBase64;
}

function removeNativeBase64ToBytes() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delete (Uint8Array as any).fromBase64;
}

describe("bytesToBase64 – non-native fallback", () => {
  let originalToBase64: ((options?: object) => string) | undefined;

  beforeEach(() => {
    mockWarn.mockClear();
    // Stash and remove the native method so the fallback is always exercised
    originalToBase64 = (Uint8Array.prototype as { toBase64?: () => string }).toBase64;
    removeNativeBytesToBase64();
  });

  afterEach(() => {
    if (originalToBase64 !== undefined) {
      (Uint8Array.prototype as { toBase64?: () => string }).toBase64 = originalToBase64;
    }
  });

  it("encodes an empty Uint8Array to an empty string", () => {
    expect(bytesToBase64(new Uint8Array([]))).toBe("");
  });

  it("encodes a single byte – 1 octet path (== padding)", () => {
    // 0x4D => "TQ=="
    expect(bytesToBase64(new Uint8Array([0x4d]))).toBe("TQ==");
  });

  it("encodes two bytes – 2 octet path (= padding)", () => {
    // 0x4D 0x61 => "TWE="
    expect(bytesToBase64(new Uint8Array([0x4d, 0x61]))).toBe("TWE=");
  });

  it("encodes three bytes – full group, no padding", () => {
    // 0x4D 0x61 0x6E => "TWFu"
    expect(bytesToBase64(new Uint8Array([0x4d, 0x61, 0x6e]))).toBe("TWFu");
  });

  it("encodes multiple full groups", () => {
    const bytes = new Uint8Array([0x4d, 0x61, 0x6e, 0x4d, 0x61, 0x6e]);
    expect(bytesToBase64(bytes)).toBe("TWFuTWFu");
  });

  it("encodes all-zero bytes", () => {
    expect(bytesToBase64(new Uint8Array([0, 0, 0]))).toBe("AAAA");
  });

  it("encodes all-max-value bytes", () => {
    expect(bytesToBase64(new Uint8Array([255, 255, 255]))).toBe("////");
  });
});

describe("bytesToBase64 – native path", () => {
  it("delegates to toBase64 when it exists on the instance", () => {
    const nativeResult = "nativeBase64==";
    const bytes = new Uint8Array([1, 2, 3]) as Uint8Array & { toBase64: () => string };
    bytes.toBase64 = vi.fn().mockReturnValue(nativeResult);
    expect(bytesToBase64(bytes)).toBe(nativeResult);
    expect(bytes.toBase64).toHaveBeenCalledOnce();
  });
});

describe("base64ToBytes – non-native fallback", () => {
  let originalFromBase64: ((base64: string, options?: object) => Uint8Array) | undefined;

  beforeEach(() => {
    mockWarn.mockClear();
    // Stash and remove the native static method so the fallback is always exercised
    originalFromBase64 = Uint8Array.fromBase64;
    removeNativeBase64ToBytes();
  });

  afterEach(() => {
    if (originalFromBase64 !== undefined) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (Uint8Array as any).fromBase64 = originalFromBase64;
    }
  });

  it("decodes a standard base64 string with no padding needed", () => {
    // "TWFu" => "Man"
    expect(base64ToBytes("TWFu")).toEqual(new Uint8Array([0x4d, 0x61, 0x6e]));
  });

  it("decodes base64 with a single trailing padding char", () => {
    // "TWE=" => "Ma"
    expect(base64ToBytes("TWE=")).toEqual(new Uint8Array([0x4d, 0x61]));
  });

  it("decodes base64 with double trailing padding chars", () => {
    // "TQ==" => "M"
    expect(base64ToBytes("TQ==")).toEqual(new Uint8Array([0x4d]));
  });

  it("decodes an empty string to an empty Uint8Array", () => {
    expect(base64ToBytes("")).toEqual(new Uint8Array([]));
  });

  it("decodes multiple full groups", () => {
    expect(base64ToBytes("TWFuTWFu")).toEqual(
      new Uint8Array([0x4d, 0x61, 0x6e, 0x4d, 0x61, 0x6e]),
    );
  });

  it("warns and recovers when 1 padding char is missing (length % 4 === 3)", () => {
    // "TWE" is "TWE=" without the trailing "="
    const result = base64ToBytes("TWE");
    expect(mockWarn).toHaveBeenCalledOnce();
    expect(result).toEqual(new Uint8Array([0x4d, 0x61]));
  });

  it("warns and recovers when 2 padding chars are missing (length % 4 === 2)", () => {
    // "TQ" is "TQ==" without the trailing "=="
    const result = base64ToBytes("TQ");
    expect(mockWarn).toHaveBeenCalledOnce();
    expect(result).toEqual(new Uint8Array([0x4d]));
  });

  it("does not warn when input is already correctly padded", () => {
    base64ToBytes("TWFu");
    expect(mockWarn).not.toHaveBeenCalled();
  });

  it("throws when an invalid base64 character is encountered", () => {
    expect(() => base64ToBytes("TQ=!")).toThrow("Unable to parse base64 string.");
  });

  it("throws when a high char code (>= 123) is encountered", () => {
    // '~' has char code 126, beyond the base64codes table
    expect(() => base64ToBytes("TQ=~")).toThrow("Unable to parse base64 string.");
  });

  it("throws when a padding char appears in a non-terminal position", () => {
    expect(() => base64ToBytes("TQ==A")).toThrow("Unable to parse base64 string.");
  });

  it("is the inverse of bytesToBase64 for arbitrary byte sequences", () => {
    const original = new Uint8Array([0, 1, 127, 128, 200, 255, 42, 7]);
    const encoded = bytesToBase64(original);
    expect(base64ToBytes(encoded)).toEqual(original);
  });
});

describe("base64ToBytes – native path", () => {
  it("delegates to Uint8Array.fromBase64 when it exists", () => {
    const fakeResult = new Uint8Array([1, 2, 3]);
    const spy = vi.fn().mockReturnValue(fakeResult);
    (Uint8Array as { fromBase64?: unknown }).fromBase64 = spy;

    try {
      const result = base64ToBytes("AQID");
      expect(spy).toHaveBeenCalledWith("AQID");
      expect(result).toBe(fakeResult);
    } finally {
      delete (Uint8Array as { fromBase64?: unknown }).fromBase64;
    }
  });
});
