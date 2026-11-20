import { IDBPDatabase, openDB } from "idb";
import { IndexedDBError } from "../../utils";

/**
 * A very short function to know if IndexedDB is supported by the current browser.
 *
 * @returns - Wether or not IndexedDB is supported
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
  return new Promise((resolve, reject) => {
    if (!isIndexedDBSupported()) {
      return reject(new IndexedDBError("IndexedDB is not supported in your browser"));
    }

    return resolve(
      openDB(dbName, 1, {
        upgrade(db) {
          // List all contents loaded. Intended to be loaded in bulk to present
          // all the available contents.
          db.createObjectStore("content-list", {
            keyPath: "contentId",
          });

          // Precize information on specific contents
          db.createObjectStore("content-info", {
            keyPath: "contentId",
          });

          // Storage of individual segments.
          const segmentObjStore = db.createObjectStore("segments", {
            keyPath: "key",
          });
          segmentObjStore.createIndex("contentId", "contentId", {
            unique: false,
          });
        },
      }),
    );
  });
}
