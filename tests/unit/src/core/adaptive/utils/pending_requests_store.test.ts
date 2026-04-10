import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import PendingRequestsStore from "../../../../../../src/core/adaptive/utils/pending_requests_store.ts";
import type {
  IPendingRequestStoreBegin,
  IPendingRequestStoreProgress,
} from "../../../../../../src/core/adaptive/utils/pending_requests_store.ts";
import {
  DummyManifest,
  DummyPeriod,
  DummyAdaptation,
  DummyRepresentation,
  createSegment,
} from "../../../../mocks/manifest.ts";

const mocks = vi.hoisted(() => ({
  warn: vi.fn(),
}));

// Mock dependencies
vi.mock("../../../../../../src/log", () => ({
  default: {
    warn: mocks.warn,
  },
}));

describe("PendingRequestsStore", () => {
  let store: PendingRequestsStore;

  const createMockContent = (segmentTime: number = 0) => ({
    manifest: new DummyManifest(),
    period: new DummyPeriod(),
    adaptation: new DummyAdaptation(),
    representation: new DummyRepresentation(),
    segment: createSegment({ time: segmentTime }),
  });

  const createMockRequest = (
    id: string = "req-1",
    requestTimestamp: number = 1000,
    segmentTime: number = 0,
  ): IPendingRequestStoreBegin => ({
    id,
    requestTimestamp,
    content: createMockContent(segmentTime),
  });

  const createMockProgress = (
    id: string = "req-1",
    duration: number = 0.5,
    size: number = 1024,
    totalSize: number = 2048,
    timestamp: number = 1500,
  ): IPendingRequestStoreProgress => ({
    id,
    duration,
    size,
    totalSize,
    timestamp,
  });

  beforeEach(() => {
    store = new PendingRequestsStore();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("add", () => {
    it("should add a new pending request", () => {
      const request = createMockRequest();

      store.add(request);

      const requests = store.getRequests();
      expect(requests).toHaveLength(1);
      expect(requests[0]).toEqual({
        requestTimestamp: request.requestTimestamp,
        progress: [],
        content: request.content,
      });
    });

    it("should add multiple pending requests", () => {
      const request1 = createMockRequest("req-1", 1000);
      const request2 = createMockRequest("req-2", 2000);

      store.add(request1);
      store.add(request2);

      const requests = store.getRequests();
      expect(requests).toHaveLength(2);
    });

    it("should initialize progress as empty array", () => {
      const request = createMockRequest();

      store.add(request);

      const requests = store.getRequests();
      expect(requests[0].progress).toEqual([]);
    });
  });

  describe("addProgress", () => {
    it("should add progress to an existing request", () => {
      const request = createMockRequest("req-1");
      const progress = createMockProgress("req-1");

      store.add(request);
      store.addProgress(progress);

      const requests = store.getRequests();
      expect(requests[0].progress).toHaveLength(1);
      expect(requests[0].progress[0]).toEqual(progress);
    });

    it("should add multiple progress updates to the same request", () => {
      const request = createMockRequest("req-1");
      const progress1 = createMockProgress("req-1", 0.5, 1024);
      const progress2 = createMockProgress("req-1", 1.0, 2048);

      store.add(request);
      store.addProgress(progress1);
      store.addProgress(progress2);

      const requests = store.getRequests();
      expect(requests[0].progress).toHaveLength(2);
      expect(requests[0].progress[0]).toEqual(progress1);
      expect(requests[0].progress[1]).toEqual(progress2);
    });

    it("should throw error when adding progress for non-existent request", () => {
      const progress = createMockProgress("unknown-id");

      expect(() => store.addProgress(progress)).toThrow(
        "ABR: progress for a request not added",
      );
    });
  });

  describe("remove", () => {
    it("should remove an existing request", () => {
      const request = createMockRequest("req-1");

      store.add(request);
      expect(store.getRequests()).toHaveLength(1);

      store.remove("req-1");
      expect(store.getRequests()).toHaveLength(0);
    });

    it("should only remove the specified request", () => {
      const request1 = createMockRequest("req-1");
      const request2 = createMockRequest("req-2");

      store.add(request1);
      store.add(request2);

      store.remove("req-1");

      const requests = store.getRequests();
      expect(requests).toHaveLength(1);
      expect(requests[0].content).toBe(request2.content);
    });

    it("should throw error when removing non-existent request", () => {
      expect(() => store.remove("unknown-id")).toThrow(
        "ABR: can't remove unknown request",
      );
    });
  });

  describe("getRequests", () => {
    it("should return empty array when no requests exist", () => {
      const requests = store.getRequests();
      expect(requests).toEqual([]);
    });

    it("should return all pending requests", () => {
      const request1 = createMockRequest("req-1");
      const request2 = createMockRequest("req-2");

      store.add(request1);
      store.add(request2);

      const requests = store.getRequests();
      expect(requests).toHaveLength(2);
    });

    it("should sort requests by segment time in chronological order", () => {
      const request1 = createMockRequest("req-1", 1000, 300);
      const request2 = createMockRequest("req-2", 2000, 100);
      const request3 = createMockRequest("req-3", 3000, 200);

      store.add(request1);
      store.add(request2);
      store.add(request3);

      const requests = store.getRequests();
      expect(requests[0].content.segment.time).toBe(100);
      expect(requests[1].content.segment.time).toBe(200);
      expect(requests[2].content.segment.time).toBe(300);
    });

    it("should return requests with their progress updates", () => {
      const request = createMockRequest("req-1");
      const progress1 = createMockProgress("req-1", 0.5, 1024);
      const progress2 = createMockProgress("req-1", 1.0, 2048);

      store.add(request);
      store.addProgress(progress1);
      store.addProgress(progress2);

      const requests = store.getRequests();
      expect(requests[0].progress).toEqual([progress1, progress2]);
    });

    it("should not include removed requests", () => {
      const request1 = createMockRequest("req-1");
      const request2 = createMockRequest("req-2");

      store.add(request1);
      store.add(request2);
      store.remove("req-1");

      const requests = store.getRequests();
      expect(requests).toHaveLength(1);
      expect(requests[0].content).toBe(request2.content);
    });

    it("should filter out null/undefined values", () => {
      const request = createMockRequest("req-1");

      store.add(request);
      // Manually corrupt the internal state to test filtering
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
      (store as any)._currentRequests.corrupted = null;

      const requests = store.getRequests();
      expect(requests).toHaveLength(1);
      expect(requests[0].content).toBe(request.content);
    });
  });

  describe("integration scenarios", () => {
    it("should handle complete request lifecycle", () => {
      const request = createMockRequest("req-1", 1000);
      const progress1 = createMockProgress("req-1", 0.5, 1024, 2048, 1500);
      const progress2 = createMockProgress("req-1", 1.0, 2048, 2048, 2000);

      // Add request
      store.add(request);
      expect(store.getRequests()).toHaveLength(1);

      // Add progress updates
      store.addProgress(progress1);
      store.addProgress(progress2);
      expect(store.getRequests()[0].progress).toHaveLength(2);

      // Remove request
      store.remove("req-1");
      expect(store.getRequests()).toHaveLength(0);
    });

    it("should handle multiple concurrent requests with different segment times", () => {
      const request1 = createMockRequest("req-1", 1000, 500);
      const request2 = createMockRequest("req-2", 1100, 200);
      const request3 = createMockRequest("req-3", 1200, 350);

      store.add(request1);
      store.add(request2);
      store.add(request3);

      store.addProgress(createMockProgress("req-1", 0.5, 512));
      store.addProgress(createMockProgress("req-2", 0.3, 300));
      store.addProgress(createMockProgress("req-3", 0.7, 700));

      const requests = store.getRequests();

      // Should be sorted by segment time: 200, 350, 500
      expect(requests[0].content.segment.time).toBe(200);
      expect(requests[1].content.segment.time).toBe(350);
      expect(requests[2].content.segment.time).toBe(500);

      // Each should have their progress
      expect(requests[0].progress).toHaveLength(1);
      expect(requests[1].progress).toHaveLength(1);
      expect(requests[2].progress).toHaveLength(1);
    });
  });
});
