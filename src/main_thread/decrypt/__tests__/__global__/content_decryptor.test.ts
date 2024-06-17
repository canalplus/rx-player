import { describe, beforeEach, it, expect, vi } from "vitest";
import { getMissingKeyIds } from "../../content_decryptor";

describe("content_decryptor - blacklist missing key Ids", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
  });

  it("should return an empty array if actualKeyIds contains all expectedKeyIds", () => {
    const expectedKeyIds = [
      new Uint8Array([1]),
      new Uint8Array([2]),
      new Uint8Array([3]),
    ];
    const actualKeyIds = [new Uint8Array([1]), new Uint8Array([2]), new Uint8Array([3])];

    const result = getMissingKeyIds(expectedKeyIds, actualKeyIds);
    expect(result).toEqual([]);
  });

  it("should return expectedKeyIds if actualKeyIds does not contain them", () => {
    const expectedKeyIds = [
      new Uint8Array([1]),
      new Uint8Array([2]),
      new Uint8Array([3]),
    ];
    const actualKeyIds: Uint8Array[] = []; // Empty array, none of the expectedKeyIds are present

    const result = getMissingKeyIds(expectedKeyIds, actualKeyIds);
    expect(result).toEqual(expectedKeyIds);
  });

  it("should return only the missing key IDs from expectedKeyIds", () => {
    const expectedKeyIds = [
      new Uint8Array([1]),
      new Uint8Array([2]),
      new Uint8Array([3]),
      new Uint8Array([4]),
    ];
    const actualKeyIds = [new Uint8Array([1]), new Uint8Array([3])]; // Missing [2] and [4]
    const result = getMissingKeyIds(expectedKeyIds, actualKeyIds);
    expect(result).toEqual([new Uint8Array([2]), new Uint8Array([4])]);
  });
});
