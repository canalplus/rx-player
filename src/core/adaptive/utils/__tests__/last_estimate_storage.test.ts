import { describe, it, expect, beforeEach } from "vitest";
import LastEstimateStorage, { ABRAlgorithmType } from "../last_estimate_storage";

/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

describe("LastEstimateStorage", () => {
  let storage: LastEstimateStorage;

  beforeEach(() => {
    storage = new LastEstimateStorage();
  });

  describe("initial state", () => {
    it("should initialize bandwidth as undefined", () => {
      expect(storage.bandwidth).toBeUndefined();
    });

    it("should initialize representation as null", () => {
      expect(storage.representation).toBeNull();
    });

    it("should initialize algorithmType as ABRAlgorithmType.None", () => {
      expect(storage.algorithmType).toBe(ABRAlgorithmType.None);
    });
  });

  describe("update()", () => {
    it("should update representation with the provided value", () => {
      const representation = { id: "rep1", bitrate: 1000 } as any;
      storage.update(representation, 500, ABRAlgorithmType.BandwidthBased);
      expect(storage.representation).toBe(representation);
    });

    it("should update bandwidth with the provided value", () => {
      const representation = { id: "rep1", bitrate: 1000 } as any;
      storage.update(representation, 500, ABRAlgorithmType.BandwidthBased);
      expect(storage.bandwidth).toBe(500);
    });

    it("should update algorithmType with the provided value", () => {
      const representation = { id: "rep1", bitrate: 1000 } as any;
      storage.update(representation, 500, ABRAlgorithmType.BandwidthBased);
      expect(storage.algorithmType).toBe(ABRAlgorithmType.BandwidthBased);
    });

    it("should allow bandwidth to be undefined", () => {
      const representation = { id: "rep1", bitrate: 1000 } as any;
      storage.update(representation, undefined, ABRAlgorithmType.BufferBased);
      expect(storage.bandwidth).toBeUndefined();
    });

    it("should correctly reflect a BufferBased algorithm type", () => {
      const representation = { id: "rep2" } as any;
      storage.update(representation, 200, ABRAlgorithmType.BufferBased);
      expect(storage.algorithmType).toBe(ABRAlgorithmType.BufferBased);
    });

    it("should correctly reflect a GuessBased algorithm type", () => {
      const representation = { id: "rep3" } as any;
      storage.update(representation, 300, ABRAlgorithmType.GuessBased);
      expect(storage.algorithmType).toBe(ABRAlgorithmType.GuessBased);
    });

    it("should overwrite previous values on subsequent updates", () => {
      const rep1 = { id: "rep1" } as any;
      const rep2 = { id: "rep2" } as any;
      storage.update(rep1, 100, ABRAlgorithmType.BandwidthBased);
      storage.update(rep2, 999, ABRAlgorithmType.GuessBased);
      expect(storage.representation).toBe(rep2);
      expect(storage.bandwidth).toBe(999);
      expect(storage.algorithmType).toBe(ABRAlgorithmType.GuessBased);
    });
  });
});
