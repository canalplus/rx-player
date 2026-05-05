import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import CdnPrioritizer from "../cdn_prioritizer.ts";

/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

const mockGetCurrent = vi.hoisted(() => {
  return vi.fn(() => ({ DEFAULT_CDN_DOWNGRADE_TIME: 60000 }));
});

vi.mock("../../../config", () => ({
  default: { getCurrent: mockGetCurrent },
}));

vi.mock("../../../utils/array_find_index", () => ({
  // eslint-disable-next-line no-restricted-properties
  default: (arr: unknown[], fn: (elt: unknown) => boolean) => arr.findIndex(fn),
}));

vi.mock("../../../utils/event_emitter", () => {
  class MockEventEmitter {
    trigger = vi.fn();
    addEventListener = vi.fn();
    removeEventListener = vi.fn();
  }
  return { default: MockEventEmitter };
});

function makeCancellationSignal(): any {
  let _cb: (() => void) | null = null;
  return {
    signal: {
      register: (cb: () => void) => {
        _cb = cb;
      },
    },
    cancel: () => _cb?.(),
  };
}

describe("CdnPrioritizer", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns single CDN as-is without prioritization", () => {
    const { signal } = makeCancellationSignal();
    const prioritizer = new CdnPrioritizer(signal);
    const cdns = [{ id: "cdn1", baseUrl: "https://cdn1.example.com" }];
    expect(prioritizer.getCdnPreferenceForResource(cdns)).toEqual(cdns);
  });

  it("returns multiple CDNs in original order when none are downgraded", () => {
    const { signal } = makeCancellationSignal();
    const prioritizer = new CdnPrioritizer(signal);
    const cdns = [
      { id: "cdn1", baseUrl: "https://cdn1.example.com" },
      { id: "cdn2", baseUrl: "https://cdn2.example.com" },
    ];
    expect(prioritizer.getCdnPreferenceForResource(cdns)).toEqual(cdns);
  });

  it("puts downgraded CDN last", () => {
    const { signal } = makeCancellationSignal();
    const prioritizer = new CdnPrioritizer(signal);
    const cdn1 = { id: "cdn1", baseUrl: "https://cdn1.example.com" };
    const cdn2 = { id: "cdn2", baseUrl: "https://cdn2.example.com" };
    prioritizer.downgradeCdn(cdn1);
    const result = prioritizer.getCdnPreferenceForResource([cdn1, cdn2]);
    expect(result).toEqual([cdn2, cdn1]);
  });

  it("triggers priorityChange when downgrading a CDN", () => {
    const { signal } = makeCancellationSignal();
    const prioritizer = new CdnPrioritizer(signal);
    const cdn = { id: "cdn1", baseUrl: "https://cdn1.example.com" };
    prioritizer.downgradeCdn(cdn);
    expect((prioritizer as any).trigger).toHaveBeenCalledWith("priorityChange", null);
  });

  it("triggers priorityChange when downgrade expires", () => {
    mockGetCurrent.mockReturnValue({ DEFAULT_CDN_DOWNGRADE_TIME: 5000 });
    const { signal } = makeCancellationSignal();
    const prioritizer = new CdnPrioritizer(signal);
    const cdn = { id: "cdn1", baseUrl: "https://cdn1.example.com" };
    prioritizer.downgradeCdn(cdn);
    const triggerMock = (prioritizer as any).trigger;
    const callCountBefore = triggerMock.mock.calls.length;
    vi.advanceTimersByTime(5000);
    expect(triggerMock.mock.calls.length).toBeGreaterThan(callCountBefore);
  });

  it("CDN is no longer downgraded after timeout expires", () => {
    mockGetCurrent.mockReturnValue({ DEFAULT_CDN_DOWNGRADE_TIME: 5000 });
    const { signal } = makeCancellationSignal();
    const prioritizer = new CdnPrioritizer(signal);
    const cdn1 = { id: "cdn1", baseUrl: "https://cdn1.example.com" };
    const cdn2 = { id: "cdn2", baseUrl: "https://cdn2.example.com" };
    prioritizer.downgradeCdn(cdn1);
    vi.advanceTimersByTime(5000);
    const result = prioritizer.getCdnPreferenceForResource([cdn1, cdn2]);
    expect(result[0]).toEqual(cdn1);
  });

  it("re-downgrading a CDN resets its downgrade timer", () => {
    mockGetCurrent.mockReturnValue({ DEFAULT_CDN_DOWNGRADE_TIME: 5000 });
    const { signal } = makeCancellationSignal();
    const prioritizer = new CdnPrioritizer(signal);
    const cdn1 = { id: "cdn1", baseUrl: "https://cdn1.example.com" };
    const cdn2 = { id: "cdn2", baseUrl: "https://cdn2.example.com" };

    prioritizer.downgradeCdn(cdn1);
    vi.advanceTimersByTime(3000);
    prioritizer.downgradeCdn(cdn1); // reset
    vi.advanceTimersByTime(3000); // only 3s since reset, should still be downgraded
    const result = prioritizer.getCdnPreferenceForResource([cdn1, cdn2]);
    expect(result[0]).toEqual(cdn2);
  });

  it("matches CDN by baseUrl when id is undefined", () => {
    const { signal } = makeCancellationSignal();
    const prioritizer = new CdnPrioritizer(signal);
    const cdn1 = { baseUrl: "https://cdn1.example.com" } as any;
    const cdn2 = { baseUrl: "https://cdn2.example.com" } as any;
    prioritizer.downgradeCdn(cdn1);
    const result = prioritizer.getCdnPreferenceForResource([cdn1, cdn2]);
    expect(result).toEqual([cdn2, cdn1]);
  });

  it("clears timeouts and resets on destroy signal", () => {
    const { signal, cancel } = makeCancellationSignal();
    const prioritizer = new CdnPrioritizer(signal);
    const cdn = { id: "cdn1", baseUrl: "https://cdn1.example.com" };
    prioritizer.downgradeCdn(cdn);
    cancel();
    // After destroy, downgraded list should be empty
    expect((prioritizer as any)._downgradedCdnList.metadata).toHaveLength(0);
    expect((prioritizer as any)._downgradedCdnList.timeouts).toHaveLength(0);
  });

  it("returns empty array when given empty array", () => {
    const { signal } = makeCancellationSignal();
    const prioritizer = new CdnPrioritizer(signal);
    expect(prioritizer.getCdnPreferenceForResource([])).toEqual([]);
  });

  it("handles multiple downgraded CDNs correctly", () => {
    const { signal } = makeCancellationSignal();
    const prioritizer = new CdnPrioritizer(signal);
    const cdn1 = { id: "cdn1", baseUrl: "https://cdn1.example.com" };
    const cdn2 = { id: "cdn2", baseUrl: "https://cdn2.example.com" };
    const cdn3 = { id: "cdn3", baseUrl: "https://cdn3.example.com" };
    prioritizer.downgradeCdn(cdn1);
    prioritizer.downgradeCdn(cdn2);
    const result = prioritizer.getCdnPreferenceForResource([cdn1, cdn2, cdn3]);
    expect(result[0]).toEqual(cdn3);
    expect(result).toContain(cdn1);
    expect(result).toContain(cdn2);
  });
});
