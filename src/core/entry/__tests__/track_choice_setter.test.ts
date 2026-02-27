import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import TrackChoiceSetter from "../track_choice_setter";

/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

const mockLog = vi.hoisted(() => {
  return { warn: vi.fn(), debug: vi.fn() };
});

vi.mock("../../../log", () => ({
  default: mockLog,
}));

const mockIsNullOrUndefined = vi.hoisted(() => {
  return vi.fn((val: unknown) => val === null || val === undefined);
});

vi.mock("../../../utils/is_null_or_undefined", () => ({
  default: mockIsNullOrUndefined,
}));

const mockObjectAssign = vi.hoisted(() => {
  return vi.fn((target: object, ...sources: object[]) =>
    // eslint-disable-next-line no-restricted-properties
    Object.assign(target, ...sources),
  );
});

vi.mock("../../../utils/object_assign", () => ({
  default: mockObjectAssign,
}));

// We need a real SharedReference-like implementation to make tests meaningful
const MockSharedReference = vi.hoisted(() => {
  return class MockedSharedReference<T> {
    private _value: T;
    public finish = vi.fn();

    constructor(initialValue: T) {
      this._value = initialValue;
    }

    getValue(): T {
      return this._value;
    }

    setValue(val: T): void {
      this._value = val;
    }
  };
});

vi.mock("../../../utils/reference", () => ({
  default: MockSharedReference,
}));

function makeRef<T>(val: T): any {
  return new MockSharedReference(val);
}

describe("TrackChoiceSetter", () => {
  let setter: TrackChoiceSetter;

  beforeEach(() => {
    setter = new TrackChoiceSetter();
  });
  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("addTrackSetter", () => {
    it("should add a track setter without error for a new period/type", () => {
      const ref = makeRef(null);
      expect(() => setter.addTrackSetter("p1", "audio", ref)).not.toThrow();
    });

    it("should warn and finish old references if track setter already declared for same period/type", () => {
      const ref1 = makeRef(null);
      const ref2 = makeRef(null);
      setter.addTrackSetter("p1", "audio", ref1);
      setter.addTrackSetter("p1", "audio", ref2);
      expect(mockLog.warn).toHaveBeenCalledOnce();
      expect(ref1.finish).toHaveBeenCalled();
    });

    it("should handle a non-null initial value on the ref", () => {
      const representationsRef = makeRef({
        representationIds: ["r1"],
        switchingMode: "direct",
      });
      const choice = {
        adaptationId: "a1",
        switchingMode: "direct",
        representations: representationsRef,
        relativeResumingPosition: undefined,
      };
      const ref = makeRef(choice);
      setter.addTrackSetter("p1", "video", ref);
      // objectAssign should have been called to replace representations with a SharedReference
      expect(mockObjectAssign).toHaveBeenCalled();
    });
  });

  describe("setTrack", () => {
    it("should return false and log debug when periodId not found", () => {
      const result = setter.setTrack("unknown", "audio", null);
      expect(result).toBe(false);
      expect(mockLog.debug).toHaveBeenCalled();
    });

    it("should return true and set null track choice", () => {
      const ref = makeRef(null);
      setter.addTrackSetter("p1", "audio", ref);
      const result = setter.setTrack("p1", "audio", null);
      expect(result).toBe(true);
    });

    it("should return true and set a valid track choice", () => {
      const ref = makeRef(null);
      setter.addTrackSetter("p1", "audio", ref);
      const result = setter.setTrack("p1", "audio", {
        adaptationId: "a1",
        switchingMode: "direct",
        initialRepresentations: {
          representationIds: ["r1"],
          switchingMode: "direct",
        },
        relativeResumingPosition: undefined,
      });
      expect(result).toBe(true);
      const val = ref.getValue();
      expect(val.adaptationId).toBe("a1");
    });

    it("should return false when bufferType not registered for a known period", () => {
      const ref = makeRef(null);
      setter.addTrackSetter("p1", "audio", ref);
      const result = setter.setTrack("p1", "video", null);
      expect(result).toBe(false);
    });
  });

  describe("updateRepresentations", () => {
    it("should return false when period not found", () => {
      const result = setter.updateRepresentations("unknown", "a1", "audio", {
        representationIds: [],
        switchingMode: "direct",
      });
      expect(result).toBe(false);
      expect(mockLog.debug).toHaveBeenCalled();
    });

    it("should return false when current trackReference value is null", () => {
      const ref = makeRef(null);
      setter.addTrackSetter("p1", "audio", ref);
      const result = setter.updateRepresentations("p1", "a1", "audio", {
        representationIds: [],
        switchingMode: "direct",
      });
      expect(result).toBe(false);
    });

    it("should return false when adaptationId is desynchronized", () => {
      const representationsRef = makeRef({
        representationIds: [],
        switchingMode: "direct",
      });
      const ref = makeRef({
        adaptationId: "a1",
        switchingMode: "direct",
        representations: representationsRef,
        relativeResumingPosition: undefined,
      });
      setter.addTrackSetter("p1", "audio", ref);
      // setTrack to ensure internal state is set
      const result = setter.updateRepresentations("p1", "different-id", "audio", {
        representationIds: [],
        switchingMode: "direct",
      });
      expect(result).toBe(false);
      expect(mockLog.debug).toHaveBeenCalled();
    });

    it("should return true and update representations when adaptationId matches", () => {
      const ref = makeRef(null);
      setter.addTrackSetter("p1", "audio", ref);
      setter.setTrack("p1", "audio", {
        adaptationId: "a1",
        switchingMode: "direct",
        initialRepresentations: {
          representationIds: ["r1"],
          switchingMode: "direct",
        },
        relativeResumingPosition: undefined,
      });

      const result = setter.updateRepresentations("p1", "a1", "audio", {
        representationIds: ["r2"],
        switchingMode: "direct",
      });
      expect(result).toBe(true);
    });
  });

  describe("removeTrackSetter", () => {
    it("should return false and log debug when period not found", () => {
      const result = setter.removeTrackSetter("unknown", "audio");
      expect(result).toBe(false);
      expect(mockLog.debug).toHaveBeenCalled();
    });

    it("should return false when bufferType not registered", () => {
      const ref = makeRef(null);
      setter.addTrackSetter("p1", "audio", ref);
      const result = setter.removeTrackSetter("p1", "video");
      expect(result).toBe(false);
    });

    it("should return true, finish references, and clean up on removal", () => {
      const ref = makeRef(null);
      setter.addTrackSetter("p1", "audio", ref);
      const result = setter.removeTrackSetter("p1", "audio");
      expect(result).toBe(true);
      // trackReference.finish should have been called
      expect(ref.finish).toHaveBeenCalled();
    });

    it("should allow re-adding after removal", () => {
      const ref = makeRef(null);
      setter.addTrackSetter("p1", "audio", ref);
      setter.removeTrackSetter("p1", "audio");
      const ref2 = makeRef(null);
      expect(() => setter.addTrackSetter("p1", "audio", ref2)).not.toThrow();
      expect(mockLog.warn).not.toHaveBeenCalled();
    });
  });

  describe("reset", () => {
    it("should finish all references and clear state", () => {
      const refAudio = makeRef(null);
      const refVideo = makeRef(null);
      setter.addTrackSetter("p1", "audio", refAudio);
      setter.addTrackSetter("p1", "video", refVideo);
      setter.reset();
      // After reset, setting a track should return false (no period registered)
      const result = setter.setTrack("p1", "audio", null);
      expect(result).toBe(false);
    });

    it("should finish all SharedReferences on reset", () => {
      const ref = makeRef(null);
      setter.addTrackSetter("p1", "audio", ref);
      setter.reset();
      expect(ref.finish).toHaveBeenCalled();
    });

    it("should handle reset on empty setter without error", () => {
      expect(() => setter.reset()).not.toThrow();
    });
  });

  describe("multiple periods", () => {
    it("should handle multiple periods independently", () => {
      const ref1 = makeRef(null);
      const ref2 = makeRef(null);
      setter.addTrackSetter("p1", "audio", ref1);
      setter.addTrackSetter("p2", "audio", ref2);

      const r1 = setter.setTrack("p1", "audio", null);
      const r2 = setter.setTrack("p2", "audio", null);
      expect(r1).toBe(true);
      expect(r2).toBe(true);
    });

    it("removing one period should not affect another", () => {
      const ref1 = makeRef(null);
      const ref2 = makeRef(null);
      setter.addTrackSetter("p1", "audio", ref1);
      setter.addTrackSetter("p2", "audio", ref2);
      setter.removeTrackSetter("p1", "audio");
      const result = setter.setTrack("p2", "audio", null);
      expect(result).toBe(true);
    });
  });
});
