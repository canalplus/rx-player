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
/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-return */

import { timer } from "rxjs";
import cleanOldLoadedSessions from "../clean_old_loaded_sessions";
import LoadedSessionsStore from "../utils/loaded_sessions_store";


const entry1 = { initializationData: { data: new Uint8Array([1, 6, 9]),
                                       type: "test" },
                 mediaKeySession: {},
                 sessionType: "" };

const entry2 = { initializationData: { data: new Uint8Array([4, 8]),
                                       type: "foo" },
                 mediaKeySession: {},
                 sessionType: "" };

const entry3 = { initializationData: { data: new Uint8Array([7, 3, 121, 87]),
                                       type: "bar" },
                 mediaKeySession: {},
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
      return timer(Math.random() * 50);
    },
  } as any;
}

const emptyLoadedSessionsStore = {
  getLength() { return 0; },
  getAll() { return []; },
  closeSession() { throw new Error("closeSession should not have been called"); },
} as any as LoadedSessionsStore;

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
function checkNothingHappen(
  loadedSessionsStore : LoadedSessionsStore,
  limit : number
) : Promise<void> {
  return new Promise((res, rej) => {

    const closeSessionSpy = jest.spyOn(loadedSessionsStore, "closeSession");
    let itemNb = 0;
    cleanOldLoadedSessions(loadedSessionsStore, limit).subscribe({
      next: () => { itemNb++; },
      error: () => { rej(new Error("The Observable should not throw")); },
      complete: () => {
        expect(itemNb).toEqual(0);
        expect(closeSessionSpy).not.toHaveBeenCalled();
        closeSessionSpy.mockRestore();
        res();
      },
    });
  });
}

/**
 * Call `cleanOldLoadedSessions` with the given loadedSessionsStore, limit and
 * entries and make sure that:
 *   - closeSession is called on the specific entries a single time
 *   - all right events are received in the right order each a single time
 *   - it completes without an error
 * Call `done` when done.
 * @param {Object} loadedSessionsStore
 * @param {number} limit
 * @param {Array.<Object>} entries
 * @param {Function} done
 */
function checkEntriesCleaned(
  loadedSessionsStore : LoadedSessionsStore,
  limit : number,
  entries : any[],
  done : () => void
) {
  const closeSessionSpy = jest.spyOn(loadedSessionsStore, "closeSession");
  let itemNb = 0;
  const pendingEntries : any[] = [];
  cleanOldLoadedSessions(loadedSessionsStore, limit).subscribe({
    next: (evt) => {
      if (evt.type === "cleaning-old-session") {
        pendingEntries.push(evt.value);
      }
      itemNb++;
      if (itemNb <= entries.length) {
        expect(evt).toEqual({ type: "cleaning-old-session",
                              value: entries[itemNb - 1] });
      } else if (itemNb > entries.length * 2) {
        throw new Error("Too many received items: " + String(itemNb));
      } else {
        expect(evt.type).toEqual("cleaned-old-session");
        expect(pendingEntries).not.toHaveLength(0);
        expect(pendingEntries).toContainEqual(evt.value);
        pendingEntries.splice(pendingEntries.indexOf(evt.value), 1);
      }
    },
    error: () => { throw new Error("The Observable should not throw"); },
    complete: () => {
      expect(pendingEntries).toEqual([]);
      expect(itemNb).toEqual(entries.length * 2);
      done();
    },
  });
  expect(closeSessionSpy).toHaveBeenCalledTimes(entries.length);
  for (let i = 0; i < entries.length; i++) {
    expect(closeSessionSpy)
      .toHaveBeenNthCalledWith(i + 1, entries[i].initializationData);
  }
  closeSessionSpy.mockRestore();
}

describe("core - eme - cleanOldLoadedSessions", () => {
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

  it("should remove some if the limit is inferior to the current length", (done) => {
    checkEntriesCleaned(createLoadedSessionsStore(),
                        1,
                        [ entry1, entry2 ],
                        done);
    checkEntriesCleaned(createLoadedSessionsStore(),
                        2,
                        [ entry1 ],
                        done);
  });

  it("should remove all if the limit is equal to 0", (done) => {
    checkEntriesCleaned(createLoadedSessionsStore(),
                        0,
                        [ entry1, entry2, entry3 ],
                        done);
  });
});
