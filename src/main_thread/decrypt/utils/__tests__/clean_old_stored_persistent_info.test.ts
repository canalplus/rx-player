import { describe, it, expect, vi } from "vitest";

/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-explicit-any */

function createPersistentSessionsStore() {
  return {
    getLength(): number {
      return 3;
    },
    deleteOldSessions(): void {
      return;
    },
  };
}

const emptyPersistentSessionsStore = {
  getLength() {
    return 0;
  },
  getAll() {
    return [];
  },
  deleteOldSessions(): void {
    return;
  },
};

/**
 * Call `cleanOldStoredPersistentInfo` with the given persistentSessionsStore
 * and limit and make sure that no side-effect happen when running.
 * @param {Object} persistentSessionsStore
 * @param {number} limit
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function checkNothingHappen(persistentSessionsStore: any, limit: number) {
  const mockDeleteLast = vi.spyOn(persistentSessionsStore, "deleteOldSessions");
  const mockLogInfo = vi.fn();
  vi.doMock("../../../../log", () => ({
    default: { info: mockLogInfo },
  }));
  const cleanOldStoredPersistentInfo = (
    (await vi.importActual("../clean_old_stored_persistent_info")) as any
  ).default;
  cleanOldStoredPersistentInfo(persistentSessionsStore, limit);
  expect(mockDeleteLast).not.toHaveBeenCalled();
  expect(mockLogInfo).not.toHaveBeenCalled();
  vi.resetModules();
}

/**
 * Call `cleanOldStoredPersistentInfo` with the given persistentSessionsStore
 * and limit and check that the right number of session information is removed.
 * @param {Object} persistentSessionsStore
 * @param {number} limit
 * @param {number} numberToRemove
 */
async function checkRemoved(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  persistentSessionsStore: any,
  limit: number,
  numberToRemove: number,
) {
  const mockDeleteLast = vi.spyOn(persistentSessionsStore, "deleteOldSessions");
  const mockLogInfo = vi.fn();
  vi.doMock("../../../../log", () => ({
    default: { info: mockLogInfo },
  }));
  const cleanOldStoredPersistentInfo = (
    (await vi.importActual("../clean_old_stored_persistent_info")) as any
  ).default;
  cleanOldStoredPersistentInfo(persistentSessionsStore, limit);
  expect(mockDeleteLast).toHaveBeenCalledTimes(1);
  expect(mockDeleteLast).toHaveBeenCalledWith(numberToRemove);
  expect(mockLogInfo).toHaveBeenCalledTimes(1);
  expect(mockLogInfo).toHaveBeenCalledWith(
    "DRM: Too many stored persistent sessions," + " removing some.",
    persistentSessionsStore.getLength(),
    numberToRemove,
  );
  vi.resetModules();
}

describe("decrypt - cleanOldStoredPersistentInfo", () => {
  it("should do nothing with a negative limit", async () => {
    await checkNothingHappen(createPersistentSessionsStore(), -1);
    await checkNothingHappen(createPersistentSessionsStore(), -20);
    await checkNothingHappen(emptyPersistentSessionsStore, -20);
  });

  it("should do nothing with a limit equal to NaN", async () => {
    await checkNothingHappen(createPersistentSessionsStore(), NaN);
    await checkNothingHappen(emptyPersistentSessionsStore, NaN);
  });

  it("should do nothing with a limit equal to -infinity", async () => {
    await checkNothingHappen(createPersistentSessionsStore(), -Infinity);
    await checkNothingHappen(emptyPersistentSessionsStore, -Infinity);
  });

  it("should do nothing if the limit is superior to the current length", async () => {
    await checkNothingHappen(createPersistentSessionsStore(), 4);
    await checkNothingHappen(createPersistentSessionsStore(), 5);
    await checkNothingHappen(createPersistentSessionsStore(), 6);
    await checkNothingHappen(createPersistentSessionsStore(), +Infinity);
    await checkNothingHappen(emptyPersistentSessionsStore, 1);
    await checkNothingHappen(emptyPersistentSessionsStore, 2);
    await checkNothingHappen(emptyPersistentSessionsStore, 1000);
    await checkNothingHappen(emptyPersistentSessionsStore, +Infinity);
  });

  it("should do nothing if the limit is equal to the current length", async () => {
    await checkNothingHappen(createPersistentSessionsStore(), 3);
    await checkNothingHappen(emptyPersistentSessionsStore, 0);
  });

  it("should remove some if the limit is inferior to the current length", async () => {
    await checkRemoved(createPersistentSessionsStore(), 1, 2);
    await checkRemoved(createPersistentSessionsStore(), 2, 1);
  });

  it("should remove all if the limit is equal to 0", async () => {
    await checkRemoved(createPersistentSessionsStore(), 0, 3);
  });
});
