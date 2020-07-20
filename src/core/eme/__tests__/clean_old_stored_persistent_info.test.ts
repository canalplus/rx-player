/**
 * Copyright 2015 CANAL+ Group
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/* tslint:disable no-unsafe-any */

function createPersistentSessionsStore() {
  return {
    getLength() : number {
      return 3;
    },
    deleteOldSessions() : void {
      return ;
    },
  } as any;
}

const emptyPersistentSessionsStore = {
  getLength() { return 0; },
  getAll() { return []; },
  deleteOldSessions() : void { return ; },
};

/**
 * Call `cleanOldStoredPersistentInfo` with the given persistentSessionsStore
 * and limit and make sure that no side-effect happen when running.
 * @param {Object} persistentSessionsStore
 * @param {number} limit
 */
function checkNothingHappen(persistentSessionsStore : any, limit : number) {
  const deleteLastSpy = jest.spyOn(persistentSessionsStore, "deleteOldSessions");
  const logInfoSpy = jest.fn();
  jest.mock("../../../log", () => ({ __esModule: true as const,
                                     default: { info: logInfoSpy } }));
  const cleanOldStoredPersistentInfo = require("../clean_old_stored_persistent_info")
    .default;
  cleanOldStoredPersistentInfo(persistentSessionsStore, limit);
  expect(deleteLastSpy).not.toHaveBeenCalled();
  expect(logInfoSpy).not.toHaveBeenCalled();
  jest.resetModules();
}

/**
 * Call `cleanOldStoredPersistentInfo` with the given persistentSessionsStore
 * and limit and check that the right number of session information is removed.
 * @param {Object} persistentSessionsStore
 * @param {number} limit
 * @param {number} numberToRemove
 */
function checkRemoved(
  persistentSessionsStore : any,
  limit : number,
  numberToRemove : number
) {
  const deleteLastSpy = jest.spyOn(persistentSessionsStore, "deleteOldSessions");
  const logInfoSpy = jest.fn();
  jest.mock("../../../log", () => ({ __esModule: true as const,
                                     default: { info: logInfoSpy } }));
  const cleanOldStoredPersistentInfo = require("../clean_old_stored_persistent_info")
    .default;
  cleanOldStoredPersistentInfo(persistentSessionsStore, limit);
  expect(deleteLastSpy).toHaveBeenCalledTimes(1);
  expect(deleteLastSpy).toHaveBeenCalledWith(numberToRemove);
  expect(logInfoSpy).toHaveBeenCalledTimes(1);
  expect(logInfoSpy).toHaveBeenCalledWith("EME: Too many stored persistent sessions," +
                                            " removing some.",
                                          persistentSessionsStore.getLength(),
                                          numberToRemove);
  jest.resetModules();
}

describe("core - eme - cleanOldStoredPersistentInfo", () => {
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
/* tslint:enable no-unsafe-any */
