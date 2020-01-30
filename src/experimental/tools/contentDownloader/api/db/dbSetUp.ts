/**
 * Copyright 2019 CANAL+ Group
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

import { IDBPDatabase, openDB } from "idb";
import { IndexedDBError } from "../../utils";

import PPromise from "../../../../../utils/promise";

/**
 * A very short function to know if IndexedDB is supported by the current browser.
 *
 * @returns Wether or not IndexedDB is supported
 *
 */
export const isIndexedDBSupported = (): boolean => "indexedDB" in window;

/**
 * Set up IndexedDB with few checks and creating tables
 *
 * @param {string} dbName The name of the IndexedDB we will initialize.
 * @returns {Promise<IDBPDatabase>} A Promise with the IndexedDB instance.
 *
 */
export function setUpDb(dbName: string): Promise<IDBPDatabase> {
  return new PPromise((resolve, reject) => {
    if (!isIndexedDBSupported()) {
      return reject(
        new IndexedDBError("IndexedDB is not supported in your browser")
      );
    }

    return resolve(
      openDB(dbName, 1, {
        upgrade(db) {
          db.createObjectStore("manifests", {
            keyPath: "contentID",
          });
          const segmentObjStore = db.createObjectStore("segments", {
            keyPath: "segmentKey", // concat 'time--representationID'
          });
          const contentsProtectionObjStore = db.createObjectStore(
            "contentsProtection",
            {
              keyPath: "drmKey",
            }
          );
          contentsProtectionObjStore.createIndex("contentID", "contentID", {
            unique: false,
          });
          segmentObjStore.createIndex("contentID", "contentID", {
            unique: false,
          });
        },
      })
    );
  });
}
