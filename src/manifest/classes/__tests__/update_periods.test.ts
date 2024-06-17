import { describe, beforeEach, it, expect, vi } from "vitest";

/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-explicit-any */

const MANIFEST_UPDATE_TYPE = {
  Full: 0,
  Partial: 1,
};

const fakeUpdatePeriodInPlaceRes = {
  updatedAdaptations: [],
  removedAdaptations: [],
  addedAdaptations: [],
};

function generateFakePeriod({
  id,
  start,
  end,
}: {
  id?: string | undefined;
  start?: number;
  end?: number | undefined;
}) {
  return {
    id: id ?? String(start),
    start: start ?? 0,
    end,
    duration: end === undefined ? undefined : end - (start ?? 0),
    streamEvents: [],
    refreshCodecSupport() {
      // noop
    },
    getAdaptations() {
      return [];
    },
    getAdaptationsForType() {
      return [];
    },
    getAdaptation() {
      return;
    },
    getSupportedAdaptations() {
      return [];
    },
    containsTime() {
      return false;
    },
    getMetadataSnapshot() {
      return {
        start: start ?? 0,
        end,
        id: id ?? String(start),
        streamEvents: [],
        adaptations: {},
      };
    },
  };
}

describe("Manifest - replacePeriods", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  // Case 1 :
  //
  // old periods : p1, p2
  // new periods : p2
  it("should remove old period", async () => {
    const fakeUpdatePeriodInPlace = vi.fn(() => {
      return fakeUpdatePeriodInPlaceRes;
    });
    vi.doMock("../update_period_in_place", () => ({
      default: fakeUpdatePeriodInPlace,
    }));
    const oldPeriods = [
      generateFakePeriod({ id: "p1", start: 0 }),
      generateFakePeriod({ id: "p2" }),
    ];
    const initialPeriods = oldPeriods.slice();
    const newPeriods = [generateFakePeriod({ id: "p2" })];
    const replacePeriods = ((await vi.importActual("../update_periods")) as any)
      .replacePeriods;
    const res = replacePeriods(oldPeriods, newPeriods);
    expect(res).toEqual({
      addedPeriods: [],
      removedPeriods: [{ start: 0, id: "p1", end: undefined }],
      updatedPeriods: [
        {
          period: {
            id: initialPeriods[1].id,
            start: initialPeriods[1].start,
            end: initialPeriods[1].end,
            duration: initialPeriods[1].duration,
            streamEvents: initialPeriods[1].streamEvents,
          },
          result: fakeUpdatePeriodInPlaceRes,
        },
      ],
    });
    expect(oldPeriods.length).toBe(1);
    expect(oldPeriods[0].id).toBe("p2");
    expect(fakeUpdatePeriodInPlace).toHaveBeenCalledTimes(1);
    expect(fakeUpdatePeriodInPlace).toHaveBeenNthCalledWith(
      1,
      initialPeriods[1],
      newPeriods[0],
      0,
    );
  });

  // Case 2 :
  //
  // old periods : p1
  // new periods : p1, p2
  it("should add new period", async () => {
    const fakeUpdatePeriodInPlace = vi.fn(() => {
      return fakeUpdatePeriodInPlaceRes;
    });
    vi.doMock("../update_period_in_place", () => ({
      default: fakeUpdatePeriodInPlace,
    }));
    const oldPeriods = [generateFakePeriod({ id: "p2" })];
    const initialPeriods = oldPeriods.slice();
    const newPeriods = [
      generateFakePeriod({ id: "p2" }),
      generateFakePeriod({ id: "p3" }),
    ];
    const replacePeriods = ((await vi.importActual("../update_periods")) as any)
      .replacePeriods;
    const res = replacePeriods(oldPeriods, newPeriods);
    expect(res).toEqual({
      addedPeriods: [newPeriods[1].getMetadataSnapshot()],
      removedPeriods: [],
      updatedPeriods: [
        {
          period: {
            id: initialPeriods[0].id,
            start: initialPeriods[0].start,
            end: initialPeriods[0].end,
            duration: initialPeriods[0].duration,
            streamEvents: initialPeriods[0].streamEvents,
          },
          result: fakeUpdatePeriodInPlaceRes,
        },
      ],
    });
    expect(oldPeriods.length).toBe(2);
    expect(oldPeriods[0].id).toBe("p2");
    expect(oldPeriods[1].id).toBe("p3");
    expect(fakeUpdatePeriodInPlace).toHaveBeenCalledTimes(1);
    expect(fakeUpdatePeriodInPlace).toHaveBeenNthCalledWith(
      1,
      initialPeriods[0],
      newPeriods[0],
      0,
    );
  });

  // Case 3 :
  //
  // old periods: p1
  // new periods: p2
  it("should replace period", async () => {
    const fakeUpdatePeriodInPlace = vi.fn(() => {
      return fakeUpdatePeriodInPlaceRes;
    });
    vi.doMock("../update_period_in_place", () => ({
      default: fakeUpdatePeriodInPlace,
    }));
    const oldPeriods = [generateFakePeriod({ id: "p1" })];
    const newPeriods = [generateFakePeriod({ id: "p2" })];
    const replacePeriods = ((await vi.importActual("../update_periods")) as any)
      .replacePeriods;
    const res = replacePeriods(oldPeriods, newPeriods);
    expect(res).toEqual({
      addedPeriods: [newPeriods[0].getMetadataSnapshot()],
      removedPeriods: [{ id: "p1", start: 0 }],
      updatedPeriods: [],
    });
    expect(oldPeriods.length).toBe(1);
    expect(oldPeriods[0].id).toBe("p2");
    expect(fakeUpdatePeriodInPlace).toHaveBeenCalledTimes(0);
  });

  // Case 4 :
  //
  // old periods: p0, p1, p2
  // new periods: p1, a, b, p2, p3
  it("should handle more complex period replacement", async () => {
    const fakeUpdatePeriodInPlace = vi.fn(() => {
      return fakeUpdatePeriodInPlaceRes;
    });
    vi.doMock("../update_period_in_place", () => ({
      default: fakeUpdatePeriodInPlace,
    }));
    const oldPeriods = [
      generateFakePeriod({ id: "p0" }),
      generateFakePeriod({ id: "p1" }),
      generateFakePeriod({ id: "p2", start: 0 }),
    ];
    const newPeriods = [
      generateFakePeriod({ id: "p1" }),
      generateFakePeriod({ id: "a" }),
      generateFakePeriod({ id: "b" }),
      generateFakePeriod({ id: "p2", start: 2 }),
      generateFakePeriod({ id: "p3" }),
    ];
    const initialPeriods = oldPeriods.slice();
    const replacePeriods = ((await vi.importActual("../update_periods")) as any)
      .replacePeriods;
    const res = replacePeriods(oldPeriods, newPeriods);
    expect(res).toEqual({
      addedPeriods: [
        newPeriods[1].getMetadataSnapshot(),
        newPeriods[2].getMetadataSnapshot(),
        newPeriods[4].getMetadataSnapshot(),
      ],
      removedPeriods: [{ id: "p0", start: 0 }],
      updatedPeriods: [
        {
          period: { id: "p1", start: 0, streamEvents: [] },
          result: fakeUpdatePeriodInPlaceRes,
        },
        {
          period: { id: "p2", start: 0, streamEvents: [] },
          result: fakeUpdatePeriodInPlaceRes,
        },
      ],
    });
    expect(oldPeriods.length).toBe(5);

    expect(oldPeriods[0].id).toBe("p1");
    expect(oldPeriods[1].id).toBe("a");
    expect(oldPeriods[2].id).toBe("b");
    expect(oldPeriods[3].id).toBe("p2");
    expect(oldPeriods[4].id).toBe("p3");
    expect(fakeUpdatePeriodInPlace).toHaveBeenCalledTimes(2);
    expect(fakeUpdatePeriodInPlace).toHaveBeenNthCalledWith(
      1,
      initialPeriods[1],
      newPeriods[0],
      0,
    );
    expect(fakeUpdatePeriodInPlace).toHaveBeenNthCalledWith(
      2,
      initialPeriods[2],
      newPeriods[3],
      0,
    );
  });

  // Case 5 :
  //
  // old periods : p2
  // new periods : p1, p2
  it("should add new period before", async () => {
    const fakeUpdatePeriodInPlace = vi.fn(() => {
      return fakeUpdatePeriodInPlaceRes;
    });
    vi.doMock("../update_period_in_place", () => ({
      default: fakeUpdatePeriodInPlace,
    }));
    const oldPeriods = [generateFakePeriod({ id: "p2" })];
    const newPeriods = [
      generateFakePeriod({ id: "p1" }),
      generateFakePeriod({ id: "p2" }),
    ];
    const initialPeriods = oldPeriods.slice();
    const replacePeriods = ((await vi.importActual("../update_periods")) as any)
      .replacePeriods;
    const res = replacePeriods(oldPeriods, newPeriods);
    expect(res).toEqual({
      addedPeriods: [newPeriods[0].getMetadataSnapshot()],
      removedPeriods: [],
      updatedPeriods: [
        {
          period: { id: "p2", start: 0, streamEvents: [] },
          result: fakeUpdatePeriodInPlaceRes,
        },
      ],
    });
    expect(oldPeriods.length).toBe(2);
    expect(oldPeriods[0].id).toBe("p1");
    expect(oldPeriods[1].id).toBe("p2");
    expect(fakeUpdatePeriodInPlace).toHaveBeenCalledTimes(1);
    expect(fakeUpdatePeriodInPlace).toHaveBeenNthCalledWith(
      1,
      initialPeriods[0],
      newPeriods[1],
      MANIFEST_UPDATE_TYPE.Full,
    );
  });

  // Case 6 :
  //
  // old periods : p1, p2
  // new periods : No periods
  it("should remove all periods", async () => {
    const fakeUpdatePeriodInPlace = vi.fn(() => {
      return fakeUpdatePeriodInPlaceRes;
    });
    vi.doMock("../update_period_in_place", () => ({
      default: fakeUpdatePeriodInPlace,
    }));
    const oldPeriods = [
      generateFakePeriod({ id: "p1" }),
      generateFakePeriod({ id: "p2" }),
    ];
    const newPeriods = [] as any[];
    const replacePeriods = ((await vi.importActual("../update_periods")) as any)
      .replacePeriods;
    const res = replacePeriods(oldPeriods, newPeriods);
    expect(res).toEqual({
      addedPeriods: [],
      removedPeriods: [
        { id: "p1", start: 0 },
        { id: "p2", start: 0 },
      ],
      updatedPeriods: [],
    });
    expect(oldPeriods.length).toBe(0);
    expect(fakeUpdatePeriodInPlace).toHaveBeenCalledTimes(0);
  });

  // Case 7 :
  //
  // old periods : No periods
  // new periods : p1, p2
  it("should add all periods to empty array", async () => {
    const fakeUpdatePeriodInPlace = vi.fn(() => {
      return fakeUpdatePeriodInPlaceRes;
    });
    vi.doMock("../update_period_in_place", () => ({
      default: fakeUpdatePeriodInPlace,
    }));
    const oldPeriods = [] as any[];
    const newPeriods = [
      generateFakePeriod({ id: "p1" }),
      generateFakePeriod({ id: "p2" }),
    ];
    const replacePeriods = ((await vi.importActual("../update_periods")) as any)
      .replacePeriods;
    const res = replacePeriods(oldPeriods, newPeriods);
    expect(res).toEqual({
      addedPeriods: [
        newPeriods[0].getMetadataSnapshot(),
        newPeriods[1].getMetadataSnapshot(),
      ],
      removedPeriods: [],
      updatedPeriods: [],
    });
    expect(oldPeriods.length).toBe(2);
    expect(oldPeriods[0].id).toBe("p1");
    expect(oldPeriods[1].id).toBe("p2");
    expect(fakeUpdatePeriodInPlace).toHaveBeenCalledTimes(0);
  });
});

describe("Manifest - updatePeriods", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  // Case 1 :
  //
  // old periods : p1, p2
  // new periods : p2
  it("should not remove old period", async () => {
    const fakeUpdatePeriodInPlace = vi.fn(() => {
      return fakeUpdatePeriodInPlaceRes;
    });
    vi.doMock("../update_period_in_place", () => ({
      default: fakeUpdatePeriodInPlace,
    }));
    const oldPeriods = [
      generateFakePeriod({ id: "p1", start: 50, end: 60 }),
      generateFakePeriod({ id: "p2", start: 60 }),
    ];
    const newPeriods = [generateFakePeriod({ id: "p2", start: 60 })];
    const initialPeriods = oldPeriods.slice();

    const updatePeriods = ((await vi.importActual("../update_periods")) as any)
      .updatePeriods;
    const res = updatePeriods(oldPeriods, newPeriods);
    expect(res).toEqual({
      addedPeriods: [],
      removedPeriods: [],
      updatedPeriods: [
        {
          period: { id: "p2", start: 60, streamEvents: [] },
          result: fakeUpdatePeriodInPlaceRes,
        },
      ],
    });
    expect(oldPeriods.length).toBe(2);
    expect(oldPeriods[0].id).toBe("p1");
    expect(fakeUpdatePeriodInPlace).toHaveBeenCalledTimes(1);
    expect(fakeUpdatePeriodInPlace).toHaveBeenNthCalledWith(
      1,
      initialPeriods[1],
      newPeriods[0],
      MANIFEST_UPDATE_TYPE.Partial,
    );
  });

  // Case 2 :
  //
  // old periods : p1
  // new periods : p1, p2
  it("should add new period", async () => {
    const fakeUpdatePeriodInPlace = vi.fn(() => {
      return fakeUpdatePeriodInPlaceRes;
    });
    vi.doMock("../update_period_in_place", () => ({
      default: fakeUpdatePeriodInPlace,
    }));
    const oldPeriods = [generateFakePeriod({ id: "p2", start: 60 })];
    const newPeriods = [
      generateFakePeriod({ id: "p2", start: 60, end: 80 }),
      generateFakePeriod({ id: "p3", start: 80 }),
    ];
    const initialPeriods = oldPeriods.slice();
    const updatePeriods = ((await vi.importActual("../update_periods")) as any)
      .updatePeriods;
    const res = updatePeriods(oldPeriods, newPeriods);
    expect(res).toEqual({
      addedPeriods: [newPeriods[1].getMetadataSnapshot()],
      removedPeriods: [],
      updatedPeriods: [
        {
          period: { id: "p2", start: 60, streamEvents: [] },
          result: fakeUpdatePeriodInPlaceRes,
        },
      ],
    });
    expect(oldPeriods.length).toBe(2);
    expect(oldPeriods[0].id).toBe("p2");
    expect(oldPeriods[1].id).toBe("p3");
    expect(fakeUpdatePeriodInPlace).toHaveBeenCalledTimes(1);
    expect(fakeUpdatePeriodInPlace).toHaveBeenNthCalledWith(
      1,
      initialPeriods[0],
      newPeriods[0],
      MANIFEST_UPDATE_TYPE.Partial,
    );
  });

  // Case 3 :
  //
  // old periods: p1
  // new periods: p3
  it("should throw when encountering two distant Periods", async () => {
    const fakeUpdatePeriodInPlace = vi.fn(() => {
      return fakeUpdatePeriodInPlaceRes;
    });
    vi.doMock("../update_period_in_place", () => ({
      default: fakeUpdatePeriodInPlace,
    }));
    const oldPeriods = [generateFakePeriod({ id: "p1", start: 50, end: 60 })];
    const newPeriods = [generateFakePeriod({ id: "p3", start: 70, end: 80 })];
    const updatePeriods = ((await vi.importActual("../update_periods")) as any)
      .updatePeriods;

    let error: unknown = null;
    try {
      updatePeriods(oldPeriods, newPeriods);
    } catch (e) {
      error = e;
    }

    expect(error).toBeInstanceOf(Error);

    // Impossible check to shut-up TypeScript
    if (!(error instanceof Error)) {
      throw new Error("Impossible: already checked it was an Error instance");
    }
    expect((error as { type?: string }).type).toEqual("MEDIA_ERROR");
    expect((error as { code?: string }).code).toEqual("MANIFEST_UPDATE_ERROR");
    expect(error.message).toEqual(
      "MANIFEST_UPDATE_ERROR: Cannot perform partial update: not enough data",
    );
    expect(oldPeriods.length).toBe(1);
    expect(oldPeriods[0].id).toBe("p1");
    expect(fakeUpdatePeriodInPlace).toHaveBeenCalledTimes(0);
  });

  // Case 4 :
  //
  // old periods: p0, p1, p2
  // new periods: p1, a, b, p2, p3
  it("should handle more complex period replacement", async () => {
    const fakeUpdatePeriodInPlace = vi.fn(() => {
      return fakeUpdatePeriodInPlaceRes;
    });
    vi.doMock("../update_period_in_place", () => ({
      default: fakeUpdatePeriodInPlace,
    }));
    const oldPeriods = [
      generateFakePeriod({ id: "p0", start: 50, end: 60 }),
      generateFakePeriod({ id: "p1", start: 60, end: 69 }),
      generateFakePeriod({ id: "p1.5", start: 69, end: 70 }),
      generateFakePeriod({ id: "p2", start: 70 }),
    ];
    const newPeriods = [
      generateFakePeriod({ id: "p1", start: 60, end: 65 }),
      generateFakePeriod({ id: "a", start: 65, end: 68 }),
      generateFakePeriod({ id: "b", start: 68, end: 70 }),
      generateFakePeriod({ id: "p2", start: 70, end: 80 }),
      generateFakePeriod({ id: "p3", start: 80 }),
    ];
    const initialPeriods = oldPeriods.slice();
    const updatePeriods = ((await vi.importActual("../update_periods")) as any)
      .updatePeriods;
    const res = updatePeriods(oldPeriods, newPeriods);
    expect(res).toEqual({
      addedPeriods: [
        newPeriods[1].getMetadataSnapshot(),
        newPeriods[2].getMetadataSnapshot(),
        newPeriods[4].getMetadataSnapshot(),
      ],
      removedPeriods: [{ id: "p1.5", start: 69, end: 70 }],
      updatedPeriods: [
        {
          period: { id: "p1", start: 60, end: 69, streamEvents: [] },
          result: fakeUpdatePeriodInPlaceRes,
        },
        {
          period: { id: "p2", start: 70, streamEvents: [] },
          result: fakeUpdatePeriodInPlaceRes,
        },
      ],
    });
    expect(oldPeriods.length).toBe(6);

    expect(oldPeriods[0].id).toBe("p0");
    expect(oldPeriods[1].id).toBe("p1");
    expect(oldPeriods[2].id).toBe("a");
    expect(oldPeriods[3].id).toBe("b");
    expect(oldPeriods[4].id).toBe("p2");
    expect(oldPeriods[5].id).toBe("p3");
    expect(fakeUpdatePeriodInPlace).toHaveBeenCalledTimes(2);
    expect(fakeUpdatePeriodInPlace).toHaveBeenNthCalledWith(
      1,
      initialPeriods[1],
      newPeriods[0],
      MANIFEST_UPDATE_TYPE.Partial,
    );
    expect(fakeUpdatePeriodInPlace).toHaveBeenNthCalledWith(
      2,
      initialPeriods[3],
      newPeriods[3],
      MANIFEST_UPDATE_TYPE.Full,
    );
  });

  // Case 5 :
  //
  // old periods : p2
  // new periods : p1, p2
  it("should throw when the first period is not encountered", async () => {
    const fakeUpdatePeriodInPlace = vi.fn(() => {
      return fakeUpdatePeriodInPlaceRes;
    });
    vi.doMock("../update_period_in_place", () => ({
      default: fakeUpdatePeriodInPlace,
    }));
    const oldPeriods = [generateFakePeriod({ id: "p2", start: 70 })];
    const newPeriods = [
      generateFakePeriod({ id: "p1", start: 50, end: 70 }),
      generateFakePeriod({ id: "p2", start: 70 }),
    ];

    const updatePeriods = ((await vi.importActual("../update_periods")) as any)
      .updatePeriods;

    let error: unknown = null;
    try {
      updatePeriods(oldPeriods, newPeriods);
    } catch (e) {
      error = e;
    }

    expect(error).toBeInstanceOf(Error);

    // Impossible check to shut-up TypeScript
    if (!(error instanceof Error)) {
      throw new Error("Impossible: already checked it was an Error instance");
    }
    expect((error as { type?: string }).type).toEqual("MEDIA_ERROR");
    expect((error as { code?: string }).code).toEqual("MANIFEST_UPDATE_ERROR");
    expect(error.message).toEqual(
      "MANIFEST_UPDATE_ERROR: Cannot perform partial update: incoherent data",
    );
    expect(oldPeriods.length).toBe(1);
    expect(oldPeriods[0].id).toBe("p2");
    expect(fakeUpdatePeriodInPlace).toHaveBeenCalledTimes(0);
  });

  // Case 6 :
  //
  // old periods : p1, p2
  // new periods : No periods
  it("should keep old periods if no new Period is available", async () => {
    const fakeUpdatePeriodInPlace = vi.fn(() => {
      return fakeUpdatePeriodInPlaceRes;
    });
    vi.doMock("../update_period_in_place", () => ({
      default: fakeUpdatePeriodInPlace,
    }));
    const oldPeriods = [
      generateFakePeriod({ id: "p1" }),
      generateFakePeriod({ id: "p2" }),
    ];
    const newPeriods = [] as any[];
    const updatePeriods = ((await vi.importActual("../update_periods")) as any)
      .updatePeriods;
    const res = updatePeriods(oldPeriods, newPeriods);
    expect(res).toEqual({
      addedPeriods: [],
      removedPeriods: [],
      updatedPeriods: [],
    });
    expect(oldPeriods.length).toBe(2);
    expect(oldPeriods[0].id).toBe("p1");
    expect(oldPeriods[1].id).toBe("p2");
    expect(fakeUpdatePeriodInPlace).toHaveBeenCalledTimes(0);
  });

  // Case 7 :
  //
  // old periods : No periods
  // new periods : p1, p2
  it("should set only new Periods if none were available before", async () => {
    const fakeUpdatePeriodInPlace = vi.fn(() => {
      return fakeUpdatePeriodInPlaceRes;
    });
    vi.doMock("../update_period_in_place", () => ({
      default: fakeUpdatePeriodInPlace,
    }));
    const oldPeriods = [] as any[];
    const newPeriods = [
      generateFakePeriod({ id: "p1" }),
      generateFakePeriod({ id: "p2" }),
    ];
    const updatePeriods = ((await vi.importActual("../update_periods")) as any)
      .updatePeriods;
    const res = updatePeriods(oldPeriods, newPeriods);
    expect(res).toEqual({
      addedPeriods: [
        newPeriods[0].getMetadataSnapshot(),
        newPeriods[1].getMetadataSnapshot(),
      ],
      removedPeriods: [],
      updatedPeriods: [],
    });
    expect(oldPeriods.length).toBe(2);
    expect(oldPeriods[0].id).toBe("p1");
    expect(oldPeriods[1].id).toBe("p2");
    expect(fakeUpdatePeriodInPlace).toHaveBeenCalledTimes(0);
  });

  // Case 8 :
  //
  // old periods : p0, p1
  // new periods : p4, p5
  it("should throw if the new periods come strictly after", async () => {
    const fakeUpdatePeriodInPlace = vi.fn(() => {
      return fakeUpdatePeriodInPlaceRes;
    });
    vi.doMock("../update_period_in_place", () => ({
      default: fakeUpdatePeriodInPlace,
    }));
    const updatePeriods = ((await vi.importActual("../update_periods")) as any)
      .updatePeriods;
    const oldPeriods = [
      generateFakePeriod({ id: "p0", start: 50, end: 60 }),
      generateFakePeriod({ id: "p1", start: 60, end: 70 }),
    ];
    const newPeriods = [generateFakePeriod({ id: "p3", start: 80 })];

    let error: unknown = null;
    try {
      updatePeriods(oldPeriods, newPeriods);
    } catch (e) {
      error = e;
    }

    expect(error).toBeInstanceOf(Error);

    // Impossible check to shut-up TypeScript
    if (!(error instanceof Error)) {
      throw new Error("Impossible: already checked it was an Error instance");
    }
    expect((error as { type?: string }).type).toEqual("MEDIA_ERROR");
    expect((error as { code?: string }).code).toEqual("MANIFEST_UPDATE_ERROR");
    expect(error.message).toEqual(
      "MANIFEST_UPDATE_ERROR: Cannot perform partial update: not enough data",
    );
    expect(oldPeriods.length).toBe(2);
    expect(oldPeriods[0].id).toBe("p0");
    expect(oldPeriods[1].id).toBe("p1");
    expect(fakeUpdatePeriodInPlace).toHaveBeenCalledTimes(0);
  });

  // Case 9 :
  //
  // old periods: p1
  // new periods: p2
  it("should concatenate consecutive periods", async () => {
    const fakeUpdatePeriodInPlace = vi.fn(() => {
      return fakeUpdatePeriodInPlaceRes;
    });
    vi.doMock("../update_period_in_place", () => ({
      default: fakeUpdatePeriodInPlace,
    }));
    const oldPeriods = [generateFakePeriod({ id: "p1", start: 50, end: 60 })];
    const newPeriods = [generateFakePeriod({ id: "p2", start: 60, end: 80 })];
    const updatePeriods = ((await vi.importActual("../update_periods")) as any)
      .updatePeriods;

    const res = updatePeriods(oldPeriods, newPeriods);
    expect(res).toEqual({
      addedPeriods: [newPeriods[0].getMetadataSnapshot()],
      removedPeriods: [],
      updatedPeriods: [],
    });
    expect(oldPeriods.length).toBe(2);
    expect(oldPeriods[0].id).toBe("p1");
    expect(oldPeriods[1].id).toBe("p2");
    expect(fakeUpdatePeriodInPlace).toHaveBeenCalledTimes(0);
  });

  // Case 10 :
  //
  // old periods: p1
  // new periods: px
  it("should throw when encountering two completely different Periods with the same start", async () => {
    const fakeUpdatePeriodInPlace = vi.fn(() => {
      return fakeUpdatePeriodInPlaceRes;
    });
    vi.doMock("../update_period_in_place", () => ({
      default: fakeUpdatePeriodInPlace,
    }));
    const oldPeriods = [generateFakePeriod({ id: "p1", start: 50, end: 60 })];
    const newPeriods = [generateFakePeriod({ id: "px", start: 50, end: 70 })];
    const updatePeriods = ((await vi.importActual("../update_periods")) as any)
      .updatePeriods;

    let error: unknown = null;
    try {
      updatePeriods(oldPeriods, newPeriods);
    } catch (e) {
      error = e;
    }

    expect(error).toBeInstanceOf(Error);

    // Impossible check to shut-up TypeScript
    if (!(error instanceof Error)) {
      throw new Error("Impossible: already checked it was an Error instance");
    }
    expect((error as { type?: string }).type).toEqual("MEDIA_ERROR");
    expect((error as { code?: string }).code).toEqual("MANIFEST_UPDATE_ERROR");
    expect(error.message).toEqual(
      "MANIFEST_UPDATE_ERROR: Cannot perform partial update: incoherent data",
    );
    expect(oldPeriods.length).toBe(1);
    expect(oldPeriods[0].id).toBe("p1");
    expect(fakeUpdatePeriodInPlace).toHaveBeenCalledTimes(0);
  });

  // Case 11 :
  //
  // old periods: p0, p1, p2
  // new periods: p1, p2, p3
  it("should handle more complex period replacement", async () => {
    const fakeUpdatePeriodInPlace = vi.fn(() => {
      return fakeUpdatePeriodInPlaceRes;
    });
    vi.doMock("../update_period_in_place", () => ({
      default: fakeUpdatePeriodInPlace,
    }));
    const oldPeriods = [
      generateFakePeriod({ id: "p0", start: 50, end: 60 }),
      generateFakePeriod({ id: "p1", start: 60, end: 70 }),
      generateFakePeriod({ id: "p2", start: 70 }),
    ];
    const newPeriods = [
      generateFakePeriod({ id: "p1", start: 60, end: 65 }),
      generateFakePeriod({ id: "p2", start: 65, end: 80 }),
      generateFakePeriod({ id: "p3", start: 80 }),
    ];
    const initialPeriods = oldPeriods.slice();
    const updatePeriods = ((await vi.importActual("../update_periods")) as any)
      .updatePeriods;
    const res = updatePeriods(oldPeriods, newPeriods);
    expect(res).toEqual({
      addedPeriods: [newPeriods[2].getMetadataSnapshot()],
      removedPeriods: [],
      updatedPeriods: [
        {
          period: { id: "p1", start: 60, end: 70, streamEvents: [] },
          result: fakeUpdatePeriodInPlaceRes,
        },
        {
          period: { id: "p2", start: 70, streamEvents: [] },
          result: fakeUpdatePeriodInPlaceRes,
        },
      ],
    });
    expect(oldPeriods.length).toBe(4);

    expect(oldPeriods[0].id).toBe("p0");
    expect(oldPeriods[1].id).toBe("p1");
    expect(oldPeriods[2].id).toBe("p2");
    expect(oldPeriods[3].id).toBe("p3");
    expect(fakeUpdatePeriodInPlace).toHaveBeenCalledTimes(2);
    expect(fakeUpdatePeriodInPlace).toHaveBeenNthCalledWith(
      1,
      initialPeriods[1],
      newPeriods[0],
      MANIFEST_UPDATE_TYPE.Partial,
    );
    expect(fakeUpdatePeriodInPlace).toHaveBeenNthCalledWith(
      2,
      initialPeriods[2],
      newPeriods[1],
      MANIFEST_UPDATE_TYPE.Full,
    );
  });

  // Case 12 :
  //
  // old periods: p0, p1, p2, p3
  // new periods: p1, p3
  it("should handle more complex period replacement", async () => {
    const fakeUpdatePeriodInPlace = vi.fn(() => {
      return fakeUpdatePeriodInPlaceRes;
    });
    vi.doMock("../update_period_in_place", () => ({
      default: fakeUpdatePeriodInPlace,
    }));
    const oldPeriods = [
      generateFakePeriod({ id: "p0", start: 50, end: 60 }),
      generateFakePeriod({ id: "p1", start: 60, end: 70 }),
      generateFakePeriod({ id: "p2", start: 70, end: 80 }),
      generateFakePeriod({ id: "p3", start: 80 }),
    ];
    const newPeriods = [
      generateFakePeriod({ id: "p1", start: 60, end: 70 }),
      generateFakePeriod({ id: "p3", start: 80 }),
    ];
    const initialPeriods = oldPeriods.slice();
    const updatePeriods = ((await vi.importActual("../update_periods")) as any)
      .updatePeriods;
    const res = updatePeriods(oldPeriods, newPeriods);
    expect(res).toEqual({
      addedPeriods: [],
      removedPeriods: [{ id: "p2", start: 70, end: 80 }],
      updatedPeriods: [
        {
          period: { id: "p1", start: 60, end: 70, streamEvents: [] },
          result: fakeUpdatePeriodInPlaceRes,
        },
        {
          period: { id: "p3", start: 80, streamEvents: [] },
          result: fakeUpdatePeriodInPlaceRes,
        },
      ],
    });
    expect(oldPeriods.length).toBe(3);

    expect(oldPeriods[0].id).toBe("p0");
    expect(oldPeriods[1].id).toBe("p1");
    expect(oldPeriods[2].id).toBe("p3");
    expect(fakeUpdatePeriodInPlace).toHaveBeenCalledTimes(2);
    expect(fakeUpdatePeriodInPlace).toHaveBeenNthCalledWith(
      1,
      initialPeriods[1],
      newPeriods[0],
      MANIFEST_UPDATE_TYPE.Partial,
    );
    expect(fakeUpdatePeriodInPlace).toHaveBeenNthCalledWith(
      2,
      initialPeriods[3],
      newPeriods[1],
      MANIFEST_UPDATE_TYPE.Full,
    );
  });

  // Case 13 :
  //
  // old periods: p0, p1, p2, p3, p4
  // new periods: p1, p3
  it("should remove periods not included in the new Periods", async () => {
    const fakeUpdatePeriodInPlace = vi.fn(() => {
      return fakeUpdatePeriodInPlaceRes;
    });
    vi.doMock("../update_period_in_place", () => ({
      default: fakeUpdatePeriodInPlace,
    }));
    const oldPeriods = [
      generateFakePeriod({ id: "p0", start: 50, end: 60 }),
      generateFakePeriod({ id: "p1", start: 60, end: 70 }),
      generateFakePeriod({ id: "p2", start: 70, end: 80 }),
      generateFakePeriod({ id: "p3", start: 80, end: 90 }),
      generateFakePeriod({ id: "p4", start: 90 }),
    ];
    const initialPeriods = oldPeriods.slice();
    const newPeriods = [
      generateFakePeriod({ id: "p1", start: 60, end: 70 }),
      generateFakePeriod({ id: "p3", start: 80, end: 90 }),
    ];
    const updatePeriods = ((await vi.importActual("../update_periods")) as any)
      .updatePeriods;
    const res = updatePeriods(oldPeriods, newPeriods);
    expect(res).toEqual({
      addedPeriods: [],
      removedPeriods: [
        { id: "p2", start: 70, end: 80 },
        { id: "p4", start: 90 },
      ],
      updatedPeriods: [
        {
          period: { id: "p1", start: 60, end: 70, streamEvents: [] },
          result: fakeUpdatePeriodInPlaceRes,
        },
        {
          period: { id: "p3", start: 80, end: 90, streamEvents: [] },
          result: fakeUpdatePeriodInPlaceRes,
        },
      ],
    });
    expect(oldPeriods.length).toBe(3);

    expect(oldPeriods[0].id).toBe("p0");
    expect(oldPeriods[1].id).toBe("p1");
    expect(oldPeriods[2].id).toBe("p3");
    expect(fakeUpdatePeriodInPlace).toHaveBeenCalledTimes(2);
    expect(fakeUpdatePeriodInPlace).toHaveBeenNthCalledWith(
      1,
      initialPeriods[1],
      newPeriods[0],
      MANIFEST_UPDATE_TYPE.Partial,
    );
    expect(fakeUpdatePeriodInPlace).toHaveBeenNthCalledWith(
      2,
      initialPeriods[3],
      newPeriods[1],
      MANIFEST_UPDATE_TYPE.Full,
    );
  });
});
