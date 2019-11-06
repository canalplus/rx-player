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
import { IndexDBError } from "../../utils";

/**
 * A very short function to know if IndexDB is supported by the current browser.
 *
 * @returns Wether or not IndexDB is supported
 *
 */
export const isIndexDBSupported = (): boolean => "indexedDB" in window;

/**
 * Set up IndexDB with few checks and creating table
 *
 * @returns The IndexDB object
 *
 */
export function setUpDb(nameDB: string): Promise<IDBPDatabase> {
  if (!isIndexDBSupported()) {
    throw new IndexDBError("IndexDB is not supported in your browser");
  }

  try {
    return openDB(nameDB, 1, {
      upgrade(db) {
        db.createObjectStore("manifests", {
          keyPath: "contentID",
        });
        const segmentObjectStore = db.createObjectStore("segments", {
          keyPath: "segmentKey",
        });
        db.createObjectStore("drm", {
          keyPath: "contentID",
        });
        segmentObjectStore.createIndex("contentID", "contentID", {
          unique: false,
        });
      },
    });
  } catch (e) {
    throw new IndexDBError(e.message);
  }
}
