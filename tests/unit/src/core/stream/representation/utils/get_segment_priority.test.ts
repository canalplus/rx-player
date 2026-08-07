import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import configHandler from "../../../../../../../src/config.ts";
import getSegmentPriority from "../../../../../../../src/core/stream/representation/utils/get_segment_priority.ts";

describe("getSegmentPriority", () => {
  const originalConfig = configHandler.getCurrent();
  const mockGetCurrentConfig = vi.spyOn(configHandler, "getCurrent");
  beforeEach(() => {
    // Default configuration for most tests
    mockGetCurrentConfig.mockReturnValue({
      ...originalConfig,
      SEGMENT_PRIORITIES_STEPS: [1, 5, 10, 20],
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("priority based on distance from wanted timestamp", () => {
    it("should return priority 0 for segments at the wanted timestamp", () => {
      const result = getSegmentPriority(100, 100);
      expect(result).toBe(0);
    });

    it("should return priority 0 for segments behind the wanted timestamp", () => {
      const result = getSegmentPriority(50, 100);
      expect(result).toBe(0);
    });

    it("should return priority 0 for segments slightly ahead (distance < first step)", () => {
      const result = getSegmentPriority(100.5, 100);
      expect(result).toBe(0);
    });

    it("should return priority 1 for distance within second step", () => {
      // distance = 103 - 100 = 3, which is >= 1 but < 5
      const result = getSegmentPriority(103, 100);
      expect(result).toBe(1);
    });

    it("should return priority 2 for distance within third step", () => {
      // distance = 107 - 100 = 7, which is >= 5 but < 10
      const result = getSegmentPriority(107, 100);
      expect(result).toBe(2);
    });

    it("should return priority 3 for distance within fourth step", () => {
      // distance = 115 - 100 = 15, which is >= 10 but < 20
      const result = getSegmentPriority(115, 100);
      expect(result).toBe(3);
    });

    it("should return lowest priority (steps.length) for distance beyond all steps", () => {
      // distance = 125 - 100 = 25, which is >= 20
      const result = getSegmentPriority(125, 100);
      expect(result).toBe(4); // SEGMENT_PRIORITIES_STEPS.length
    });
  });

  describe("boundary conditions", () => {
    it("should handle exact boundary values correctly", () => {
      // distance exactly at step value should fall into next priority
      expect(getSegmentPriority(101, 100)).toBe(1); // distance = 1
      expect(getSegmentPriority(105, 100)).toBe(2); // distance = 5
      expect(getSegmentPriority(110, 100)).toBe(3); // distance = 10
      expect(getSegmentPriority(120, 100)).toBe(4); // distance = 20
    });

    it("should handle values just below boundaries", () => {
      expect(getSegmentPriority(100.999, 100)).toBe(0); // distance = 0.999 < 1
      expect(getSegmentPriority(104.999, 100)).toBe(1); // distance = 4.999 < 5
      expect(getSegmentPriority(109.999, 100)).toBe(2); // distance = 9.999 < 10
    });
  });

  describe("negative distances (segments behind wanted timestamp)", () => {
    it("should always return priority 0 for any negative distance", () => {
      expect(getSegmentPriority(50, 100)).toBe(0);
      expect(getSegmentPriority(0, 100)).toBe(0);
      expect(getSegmentPriority(99, 100)).toBe(0);
    });
  });

  describe("different config values", () => {
    it("should work with empty priority steps array", () => {
      mockGetCurrentConfig.mockReturnValue({
        ...originalConfig,
        SEGMENT_PRIORITIES_STEPS: [],
      });

      const result = getSegmentPriority(100, 50);
      expect(result).toBe(0); // steps.length = 0
    });

    it("should work with single priority step", () => {
      mockGetCurrentConfig.mockReturnValue({
        ...originalConfig,
        SEGMENT_PRIORITIES_STEPS: [10],
      });

      expect(getSegmentPriority(105, 100)).toBe(0); // distance = 5 < 10
      expect(getSegmentPriority(115, 100)).toBe(1); // distance = 15 >= 10
    });

    it("should work with different step values", () => {
      mockGetCurrentConfig.mockReturnValue({
        ...originalConfig,
        SEGMENT_PRIORITIES_STEPS: [2, 10, 30, 60],
      });

      expect(getSegmentPriority(101, 100)).toBe(0); // distance = 1 < 2
      expect(getSegmentPriority(105, 100)).toBe(1); // distance = 5, >= 2 but < 10
      expect(getSegmentPriority(120, 100)).toBe(2); // distance = 20, >= 10 but < 30
      expect(getSegmentPriority(145, 100)).toBe(3); // distance = 45, >= 30 but < 60
      expect(getSegmentPriority(170, 100)).toBe(4); // distance = 70 >= 60
    });
  });

  describe("config integration", () => {
    it("should call config.getCurrent() to get priority steps", () => {
      getSegmentPriority(100, 50);
      expect(mockGetCurrentConfig).toHaveBeenCalledOnce();
    });

    it("should get fresh config on each call", () => {
      getSegmentPriority(100, 50);
      getSegmentPriority(200, 150);
      expect(mockGetCurrentConfig).toHaveBeenCalledTimes(2);
    });
  });
});
