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

/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-return */

import cleanOldLoadedSessions from "../clean_old_loaded_sessions";
import LoadedSessionsStore from "../loaded_sessions_store";


const entry1 = { initializationData: { data: new Uint8Array([1, 6, 9]),
                                       type: "test" },
                 mediaKeySession: { sessionId: "toto" },
                 sessionType: "" };

const entry2 = { initializationData: { data: new Uint8Array([4, 8]),
                                       type: "foo" },
                 mediaKeySession: { sessionId: "titi" },
                 sessionType: "" };

const entry3 = { initializationData: { data: new Uint8Array([7, 3, 121, 87]),
                                       type: "bar" },
                 mediaKeySession: { sessionId: "tutu" },
                 sessionType: "" };

function createLoadedSessionsStore() : LoadedSessionsStore {
  return {
    getLength() {
      return 3;
    },
    getAll() {
      return [entry1, entry2, entry3];
    },
    closeSession() {
      return new Promise((res) => {
        setTimeout(res, Math.random() * 50);
      });
    },
  } as unknown as LoadedSessionsStore;
}

const emptyLoadedSessionsStore = {
  getLength() { return 0; },
  getAll() { return []; },
  closeSession() { throw new Error("closeSession should not have been called"); },
} as unknown as LoadedSessionsStore;

/**
 * Call `cleanOldLoadedSessions` with the given loadedSessionsStore and
 * limit and make sure that:
 *   - no side-effect happen when running
 *   - nothing is emitted
 *   - it just complete without an error
 * Call `done` when done.
 * @param {Object} loadedSessionsStore
 * @param {number} limit
 * @param {Function} done
 */
async function checkNothingHappen(
  loadedSessionsStore : LoadedSessionsStore,
  limit : number
) : Promise<void> {
  const mockCloseSession = jest.spyOn(loadedSessionsStore, "closeSession");
  await cleanOldLoadedSessions(loadedSessionsStore, limit);
  expect(mockCloseSession).not.toHaveBeenCalled();
  mockCloseSession.mockRestore();
}

/**
 * Call `cleanOldLoadedSessions` with the given loadedSessionsStore, limit and
 * entries and make sure that:
 *   - closeSession is called on the specific entries a single time
 *   - it completes without an error
 * Call `done` when done.
 * @param {Object} loadedSessionsStore
 * @param {number} limit
 * @param {Array.<Object>} entries
 */
async function checkEntriesCleaned(
  loadedSessionsStore : LoadedSessionsStore,
  limit : number,
  entries : Array<{ sessionId: string }>
) : Promise<void> {
  const mockCloseSession = jest.spyOn(loadedSessionsStore, "closeSession");
  const prom = cleanOldLoadedSessions(loadedSessionsStore, limit).then(() => {
    expect(mockCloseSession).toHaveBeenCalledTimes(entries.length);
    mockCloseSession.mockRestore();
  });
  expect(mockCloseSession).toHaveBeenCalledTimes(entries.length);
  for (let i = 0; i < entries.length; i++) {
    expect(mockCloseSession)
      .toHaveBeenNthCalledWith(i + 1, entries[i]);
  }
  return prom;
}

describe("core - decrypt - cleanOldLoadedSessions", () => {
  it("should do nothing with a negative limit", async () => {
    await checkNothingHappen(createLoadedSessionsStore(), -1);
    await checkNothingHappen(createLoadedSessionsStore(), -20);
    await checkNothingHappen(emptyLoadedSessionsStore, -20);
  });

  it("should do nothing with a limit equal to NaN", async () => {
    await checkNothingHappen(createLoadedSessionsStore(), NaN);
    await checkNothingHappen(emptyLoadedSessionsStore, NaN);
  });

  it("should do nothing with a limit equal to -infinity", async () => {
    await checkNothingHappen(createLoadedSessionsStore(), -Infinity);
    await checkNothingHappen(emptyLoadedSessionsStore, -Infinity);
  });

  it("should do nothing if the limit is superior to the current length", async () => {
    await checkNothingHappen(createLoadedSessionsStore(), 4);
    await checkNothingHappen(createLoadedSessionsStore(), 5);
    await checkNothingHappen(createLoadedSessionsStore(), 6);
    await checkNothingHappen(createLoadedSessionsStore(), +Infinity);
    await checkNothingHappen(emptyLoadedSessionsStore, 1);
    await checkNothingHappen(emptyLoadedSessionsStore, 2);
    await checkNothingHappen(emptyLoadedSessionsStore, 1000);
    await checkNothingHappen(emptyLoadedSessionsStore, +Infinity);

  });

  it("should do nothing if the limit is equal to the current length", async () => {
    await checkNothingHappen(createLoadedSessionsStore(), 3);
    await checkNothingHappen(emptyLoadedSessionsStore, 0);
  });

  it("should remove some if the limit is inferior to the current length", async () => {
    await checkEntriesCleaned(createLoadedSessionsStore(), 1, [ entry1.mediaKeySession,
                                                                entry2.mediaKeySession ]);
    await checkEntriesCleaned(createLoadedSessionsStore(), 2, [ entry1.mediaKeySession ]);
  });

  it("should remove all if the limit is equal to 0", async () => {
    await checkEntriesCleaned(createLoadedSessionsStore(), 0, [ entry1.mediaKeySession,
                                                                entry2.mediaKeySession,
                                                                entry3.mediaKeySession ]);
  });
});
