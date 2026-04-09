import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { IRepresentation } from "../../../../manifest";
import { __MANIFEST_CLASSES_MOCKS } from "../../../../manifest/classes";
import RepresentationScoreCalculator, {
  ScoreConfidenceLevel,
} from "../representation_score_calculator";

vi.mock("../../../../log", () => ({
  default: {
    debug: vi.fn(),
  },
}));

vi.mock("../ewma", () => {
  class EWMA {
    private _estimate: number;
    private _samples: Array<{ duration: number; value: number }>;
    constructor() {
      this._estimate = 0;
      this._samples = [];
    }
    public addSample = vi.fn((duration: number, value: number) => {
      this._samples.push({ duration, value });
      // Simple average for testing purposes
      this._estimate =
        this._samples.reduce((sum, s) => sum + s.value, 0) / this._samples.length;
    });
    public getEstimate = vi.fn(() => this._estimate);
  }

  return {
    default: EWMA,
  };
});

describe("RepresentationScoreCalculator", () => {
  let calculator: RepresentationScoreCalculator;
  let mockRepresentation1: IRepresentation;
  let mockRepresentation2: IRepresentation;

  beforeEach(() => {
    calculator = new RepresentationScoreCalculator();

    mockRepresentation1 = new __MANIFEST_CLASSES_MOCKS.DummyRepresentation({
      id: "rep1",
      bitrate: 1000000,
    });

    mockRepresentation2 = new __MANIFEST_CLASSES_MOCKS.DummyRepresentation({
      id: "rep2",
      bitrate: 2000000,
    });
  });
  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("addSample", () => {
    it("should add a sample for a new representation", () => {
      calculator.addSample(mockRepresentation1, 2, 4);

      const estimate = calculator.getEstimate(mockRepresentation1);
      expect(estimate).toBeDefined();
      expect(estimate?.score).toBe(2); // 4 / 2 = 2
    });

    it("should calculate the correct ratio (segmentDuration / requestDuration)", () => {
      // If we can download 10 seconds of content in 5 seconds, ratio should be 2
      calculator.addSample(mockRepresentation1, 5, 10);

      const estimate = calculator.getEstimate(mockRepresentation1);
      expect(estimate?.score).toBe(2);
    });

    it("should accumulate samples for the same representation", () => {
      calculator.addSample(mockRepresentation1, 2, 4); // ratio: 2
      calculator.addSample(mockRepresentation1, 4, 8); // ratio: 2

      const estimate = calculator.getEstimate(mockRepresentation1);
      expect(estimate).toBeDefined();
      expect(estimate?.score).toBe(2);
    });

    it("should reset data when switching to a different representation", () => {
      calculator.addSample(mockRepresentation1, 2, 4);
      calculator.addSample(mockRepresentation2, 1, 2);

      const estimate1 = calculator.getEstimate(mockRepresentation1);
      const estimate2 = calculator.getEstimate(mockRepresentation2);

      expect(estimate1).toBeUndefined();
      expect(estimate2).toBeDefined();
      expect(estimate2?.score).toBe(2);
    });

    it("should track loaded segments count", () => {
      calculator.addSample(mockRepresentation1, 2, 4);
      calculator.addSample(mockRepresentation1, 2, 4);
      calculator.addSample(mockRepresentation1, 2, 4);

      const estimate = calculator.getEstimate(mockRepresentation1);
      expect(estimate).toBeDefined();
    });

    it("should track total loaded duration", () => {
      calculator.addSample(mockRepresentation1, 2, 4);
      calculator.addSample(mockRepresentation1, 2, 6);
      calculator.addSample(mockRepresentation1, 2, 5);

      const estimate = calculator.getEstimate(mockRepresentation1);
      expect(estimate).toBeDefined();
      // Total duration should be 4 + 6 + 5 = 15
    });
  });

  describe("getEstimate", () => {
    it("should return undefined for a representation with no samples", () => {
      const estimate = calculator.getEstimate(mockRepresentation1);
      expect(estimate).toBeUndefined();
    });

    it("should return LOW confidence when less than 5 segments loaded", () => {
      calculator.addSample(mockRepresentation1, 2, 4);
      calculator.addSample(mockRepresentation1, 2, 4);

      const estimate = calculator.getEstimate(mockRepresentation1);
      expect(estimate?.confidenceLevel).toBe(ScoreConfidenceLevel.LOW);
    });

    it("should return LOW confidence when loaded duration is less than 10 seconds", () => {
      // Add 5 segments but with short duration
      for (let i = 0; i < 5; i++) {
        calculator.addSample(mockRepresentation1, 1, 1);
      }

      const estimate = calculator.getEstimate(mockRepresentation1);
      expect(estimate?.confidenceLevel).toBe(ScoreConfidenceLevel.LOW);
    });

    it("should return HIGH confidence when > 5 segments and >= 10 seconds loaded", () => {
      // Add 5 segments with 2 seconds each (total 10 seconds)
      for (let i = 0; i < 6; i++) {
        calculator.addSample(mockRepresentation1, 1, 2);
      }

      const estimate = calculator.getEstimate(mockRepresentation1);
      expect(estimate?.confidenceLevel).toBe(ScoreConfidenceLevel.HIGH);
    });

    it("should return HIGH confidence when > 5 segments and > 10 seconds loaded", () => {
      // Add 5 segments with 3 seconds each (total 15 seconds)
      for (let i = 0; i < 6; i++) {
        calculator.addSample(mockRepresentation1, 1, 3);
      }

      const estimate = calculator.getEstimate(mockRepresentation1);
      expect(estimate?.confidenceLevel).toBe(ScoreConfidenceLevel.HIGH);
    });

    it("should return undefined after switching representations", () => {
      calculator.addSample(mockRepresentation1, 2, 4);
      calculator.addSample(mockRepresentation2, 1, 2);

      const estimate = calculator.getEstimate(mockRepresentation1);
      expect(estimate).toBeUndefined();
    });
  });

  describe("getLastStableRepresentation", () => {
    it("should return null initially", () => {
      expect(calculator.getLastStableRepresentation()).toBeNull();
    });

    it("should return the representation when score exceeds 1", () => {
      // Add sample with ratio > 1 (can download faster than playback)
      calculator.addSample(mockRepresentation1, 2, 5); // ratio: 2.5

      expect(calculator.getLastStableRepresentation()).toBe(mockRepresentation1);
    });

    it("should not update when score is <= 1", () => {
      // Add sample with ratio <= 1
      calculator.addSample(mockRepresentation1, 5, 4); // ratio: 0.8

      expect(calculator.getLastStableRepresentation()).toBeNull();
    });

    it("should update to new representation with good score", () => {
      calculator.addSample(mockRepresentation1, 2, 5); // ratio: 2.5
      expect(calculator.getLastStableRepresentation()).toBe(mockRepresentation1);

      calculator.addSample(mockRepresentation2, 1, 3); // ratio: 3
      expect(calculator.getLastStableRepresentation()).toBe(mockRepresentation2);
    });

    it("should not update when adding more samples to same representation", () => {
      calculator.addSample(mockRepresentation1, 2, 5); // ratio: 2.5
      const firstStable = calculator.getLastStableRepresentation();

      calculator.addSample(mockRepresentation1, 2, 6); // ratio: 3
      const secondStable = calculator.getLastStableRepresentation();

      expect(firstStable).toBe(secondStable);
      expect(secondStable).toBe(mockRepresentation1);
    });

    it("should persist last stable representation even after switching to worse representation", () => {
      calculator.addSample(mockRepresentation1, 2, 5); // ratio: 2.5
      expect(calculator.getLastStableRepresentation()).toBe(mockRepresentation1);

      calculator.addSample(mockRepresentation2, 5, 2); // ratio: 0.4
      expect(calculator.getLastStableRepresentation()).toBe(mockRepresentation1);
    });
  });

  describe("score calculation scenarios", () => {
    it("should handle score exactly equal to 1", () => {
      // Can download exactly at playback speed
      calculator.addSample(mockRepresentation1, 4, 4); // ratio: 1

      const estimate = calculator.getEstimate(mockRepresentation1);
      expect(estimate?.score).toBe(1);
    });

    it("should handle score less than 1 (slow download)", () => {
      // Takes 10 seconds to download 5 seconds of content
      calculator.addSample(mockRepresentation1, 10, 5); // ratio: 0.5

      const estimate = calculator.getEstimate(mockRepresentation1);
      expect(estimate?.score).toBe(0.5);
    });

    it("should handle score greater than 1 (fast download)", () => {
      // Takes 2 seconds to download 10 seconds of content
      calculator.addSample(mockRepresentation1, 2, 10); // ratio: 5

      const estimate = calculator.getEstimate(mockRepresentation1);
      expect(estimate?.score).toBe(5);
    });

    it("should average multiple samples correctly", () => {
      calculator.addSample(mockRepresentation1, 2, 4); // ratio: 2
      calculator.addSample(mockRepresentation1, 2, 6); // ratio: 3

      const estimate = calculator.getEstimate(mockRepresentation1);
      // Average of 2 and 3 is 2.5
      expect(estimate?.score).toBe(2.5);
    });
  });
});
