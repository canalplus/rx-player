import { describe, it, expect, vi, afterEach } from "vitest";
import log from "../../../../../../src/log.ts";
import cleanOldStoredPersistentInfo from "../../../../../../src/main_thread/decrypt/utils/clean_old_stored_persistent_info.ts";
import type PersistentSessionsStore from "../../../../../../src/main_thread/decrypt/utils/persistent_sessions_store.ts";

const logInfo = vi.spyOn(log, "info").mockImplementation(() => {
  /* noop */
});

function createPersistentSessionsStore(): PersistentSessionsStore {
  return {
    getLength(): number {
      return 3;
    },
    deleteOldSessions(): void {
      return;
    },
  } as unknown as PersistentSessionsStore;
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
} as unknown as PersistentSessionsStore;

/**
 * Call `cleanOldStoredPersistentInfo` with the given persistentSessionsStore
 * and limit and make sure that no side-effect happen when running.
 * @param {Object} persistentSessionsStore
 * @param {number} limit
 */
function checkNothingHappen(
  persistentSessionsStore: PersistentSessionsStore,
  limit: number,
) {
  logInfo.mockClear();
  const mockDeleteLast = vi.spyOn(persistentSessionsStore, "deleteOldSessions");
  cleanOldStoredPersistentInfo(persistentSessionsStore, limit);
  expect(mockDeleteLast).not.toHaveBeenCalled();
  expect(logInfo).not.toHaveBeenCalled();
  vi.resetModules();
}

/**
 * Call `cleanOldStoredPersistentInfo` with the given persistentSessionsStore
 * and limit and check that the right number of session information is removed.
 * @param {Object} persistentSessionsStore
 * @param {number} limit
 * @param {number} numberToRemove
 */
function checkRemoved(
  persistentSessionsStore: PersistentSessionsStore,
  limit: number,
  numberToRemove: number,
) {
  logInfo.mockClear();
  const mockDeleteLast = vi.spyOn(persistentSessionsStore, "deleteOldSessions");
  cleanOldStoredPersistentInfo(persistentSessionsStore, limit);
  expect(mockDeleteLast).toHaveBeenCalledTimes(1);
  expect(mockDeleteLast).toHaveBeenCalledWith(numberToRemove);
  expect(logInfo).toHaveBeenCalledTimes(1);
  expect(logInfo).toHaveBeenCalledWith(
    "DRM",
    "Too many stored persistent sessions, removing some.",
    {
      numberOfPersistentSessions: persistentSessionsStore.getLength(),
      toDelete: numberToRemove,
    },
  );
  vi.resetModules();
}

describe("decrypt - cleanOldStoredPersistentInfo", () => {
  afterEach(() => {
    logInfo.mockClear();
  });
  it("should do nothing with a negative limit", () => {
    checkNothingHappen(createPersistentSessionsStore(), -1);
    checkNothingHappen(createPersistentSessionsStore(), -20);
    checkNothingHappen(emptyPersistentSessionsStore, -20);
  });

  it("should do nothing with a limit equal to NaN", () => {
    checkNothingHappen(createPersistentSessionsStore(), NaN);
    checkNothingHappen(emptyPersistentSessionsStore, NaN);
  });

  it("should do nothing with a limit equal to -infinity", () => {
    checkNothingHappen(createPersistentSessionsStore(), -Infinity);
    checkNothingHappen(emptyPersistentSessionsStore, -Infinity);
  });

  it("should do nothing if the limit is superior to the current length", () => {
    checkNothingHappen(createPersistentSessionsStore(), 4);
    checkNothingHappen(createPersistentSessionsStore(), 5);
    checkNothingHappen(createPersistentSessionsStore(), 6);
    checkNothingHappen(createPersistentSessionsStore(), +Infinity);
    checkNothingHappen(emptyPersistentSessionsStore, 1);
    checkNothingHappen(emptyPersistentSessionsStore, 2);
    checkNothingHappen(emptyPersistentSessionsStore, 1000);
    checkNothingHappen(emptyPersistentSessionsStore, +Infinity);
  });

  it("should do nothing if the limit is equal to the current length", () => {
    checkNothingHappen(createPersistentSessionsStore(), 3);
    checkNothingHappen(emptyPersistentSessionsStore, 0);
  });

  it("should remove some if the limit is inferior to the current length", () => {
    checkRemoved(createPersistentSessionsStore(), 1, 2);
    checkRemoved(createPersistentSessionsStore(), 2, 1);
  });

  it("should remove all if the limit is equal to 0", () => {
    checkRemoved(createPersistentSessionsStore(), 0, 3);
  });
});
