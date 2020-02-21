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

import { IDBPDatabase } from "idb";
import { AsyncSubject } from "rxjs";

import {
  addFeatures,
  IFeatureFunction,
} from "../../../features";
import PPromise from "../../../utils/promise";

import { setUpDb } from "./api/db/dbSetUp";
import DownloadManager from "./api/downloader/downloadManager";
import {
  getBuilderFormattedForAdaptations,
  getBuilderFormattedForSegments,
  getKeySystemsSessionsOffline,
  offlineManifestLoader,
} from "./api/downloader/manifest";
import { IContentProtection } from "./api/drm/types";
import { IActiveDownload, IActivePauses } from "./api/tracksPicker/types";
import {
  IAvailableContent,
  ICallbacks,
  IDownloadArguments,
  IPlaybackInfo,
  IStorageInfo,
  IStoredManifest,
} from "./types";
import {
  assertResumeADownload,
  checkInitDownloaderOptions,
  isPersistentLicenseSupported,
  isValidContentID,
  SegmentConstuctionError,
  ValidationArgsError,
} from "./utils";

/**
 * Instanciate a ContentDownloader
 *
 * @param {}
 * @return {IContentDownloader}
 */
class ContentDownloader {
 /**
  * Add a given parser from the list of features.
  * @param {Array.<Function>} parsersList
  */
  static addParsers(parsersList : IFeatureFunction[]) : void {
    addFeatures(parsersList);
  }

  /**
   * Detect if the current environment is supported for persistent licence
   * @returns {boolean} - is supported
   */
  static isPersistentLicenseSupported(): Promise<boolean> {
    return isPersistentLicenseSupported();
  }

  /**
   * Get informations on the storage usage of the navigator
   * @returns {Promise<IStorageInfo | null>} the space used and the total usable in bytes
   */
  static async getStorageInfo(): Promise<IStorageInfo | null> {
    if (navigator.storage == null || navigator.storage.estimate == null) {
      return null;
    }
    const { quota, usage } = await navigator.storage.estimate();
    if (quota === undefined || usage === undefined) {
      return null;
    }
    return {
      total: quota,
      used: usage,
    };
  }

  public readonly dbName: string;
  private db: IDBPDatabase | null;
  private activeDownloads: IActiveDownload;
  private activePauses: IActivePauses;

  constructor() {
    this.dbName = "d2g-rxPlayer";
    this.activeDownloads = {};
    this.activePauses = {};
    this.db = null;
  }

  /**
   * Initialize the download environment.
   * Must be invocated at the beginning in order to store segment.
   * @returns {Promise<void>}
   */
  initialize(): Promise<void> {
    return new Promise((resolve, reject) => {
      setUpDb(this.dbName)
        .then(db => {
          this.db = db;
          resolve();
        })
        .catch((error) => {
          if (error instanceof Error) {
            reject(error);
          }
        });
    });
  }

  /**
   * Start a download from scratch.
   * @param {Object<ISettingsDownloader>} settings
   * @returns {Promise.<string|void>} contentID -
   *  return the id generated of the content or void if an error happened
   */
  async download(options: IDownloadArguments): Promise<string | void> {
    try {
      if (this.db === null) {
        throw new Error("You must run initialize() first!");
      }
      const db = this.db;
      const contentID = await checkInitDownloaderOptions(options, db);
      const { metadata, transport, url } = options;
      const pause$ = new AsyncSubject<void>();
      this.activePauses[contentID] = pause$;
      const downloadManager = new DownloadManager({
        db,
      });
      const initDownloadSub = downloadManager
        .initDownload({ ...options, contentID }, pause$)
        .subscribe(
          ([download]) => {
            if (download === null) {
              return;
            }
            const { progress, manifest, audio, video, text, size } = download;
            if (manifest === null) {
              return;
            }
            db.put("manifests", {
              url,
              contentID,
              transport,
              manifest,
              builder: { video, audio, text },
              progress,
              size,
              duration: manifest.getMaximumPosition() - manifest.getMinimumPosition(),
              metadata,
            }).catch((err: Error) => {
              if (err instanceof Error) {
               return options?.onError?.(err);
              }
            });
          },
          (err) => {
            if (err instanceof Error) {
              return options?.onError?.(err);
            }
          }
        );
      this.activeDownloads[contentID] = initDownloadSub;
      return contentID;
    } catch (err) {
      if (err instanceof Error) {
        return options?.onError?.(err);
      }
    }
  }

  /**
   * Resume a download already started earlier.
   * @param {string} contentID
   * @returns {Promise.<void>}
   */
  async resume(contentID: string, callbacks?: ICallbacks): Promise<void> {
    try {
      if (this.db === null) {
        throw new Error("You must run initialize() first!");
      }
      const db = this.db;
      if (contentID == null || contentID === "") {
        throw new Error("You must specify a valid contentID for resuming.");
      }
      const storedManifest = await db.get(
        "manifests",
        contentID
      ) as IStoredManifest;
      assertResumeADownload(storedManifest, this.activeDownloads);
      const pause$ = new AsyncSubject<void>();
      this.activePauses[contentID] = pause$;
      const downloadManager = new DownloadManager({
        db,
      });
      const resumeDownloadSub = downloadManager
        .resumeDownload(storedManifest, pause$, callbacks)
        .subscribe(
          ([download]) => {
            if (download === null) {
              return;
            }
            const { progress, manifest, audio, video, text, size } = download;
            if (manifest === null) {
              return;
            }
            const { metadata, transport, duration, url } = storedManifest;
            db.put("manifests", {
              url,
              contentID,
              transport,
              manifest,
              builder: { video, audio, text },
              progress,
              size,
              duration,
              metadata,
            }).catch((err) => {
              if (err instanceof Error) {
               return callbacks?.onError?.(err);
              }
            });
          },
          (err) => {
            if (err instanceof Error) {
              return callbacks?.onError?.(err);
            }
          }
        );
      this.activeDownloads[contentID] = resumeDownloadSub;
    } catch (err) {
      if (err instanceof Error) {
        return callbacks?.onError?.(err);
      }
    }
  }

  /**
   * Pause a download already started earlier.
   * @param {string} contentID
   * @returns {void}
   */
  pause(contentID: string): void {
    isValidContentID(contentID);
    const activeDownloads = this.activeDownloads;
    const activePauses = this.activePauses;
    if (activeDownloads[contentID] == null || activePauses[contentID] == null) {
      throw new ValidationArgsError(`Invalid contentID given: ${contentID}`);
    }
    activePauses[contentID].next();
    activePauses[contentID].complete();
    activeDownloads[contentID].unsubscribe();
    delete activeDownloads[contentID];
    delete activePauses[contentID];
  }

  /**
   * Get all the downloaded entry (manifest) partially or fully downloaded.
   * @returns {Promise.<IAvailableContent[]>}
   */
  getAvailableContents(
    limit?: number
  ): Promise<IAvailableContent[]> | undefined {
    return new Promise((resolve, reject) => {
      if (this.db === null) {
        return reject(new Error("You must run initialize() first!"));
      }

      return resolve(this.db.getAll("manifests", undefined, limit)
        .then((manifests: IStoredManifest[]) => {
          return manifests.map(
            ({ contentID, metadata, size, duration, progress, url, transport }) => ({
          id: contentID,
          metadata,
          size,
          duration,
          progress: progress.percentage,
          isFinished: progress.percentage === 100,
          url,
          transport,
        }));
      }));
    });
  }

  /**
   * Get a single content ready to be played by the rx-player,
   * could be fully or partially downloaded.
   * @param {string} contentID
   * @returns {Promise.<IPlaybackInfo|void>}
   */
  async getPlaybackInfo(contentID: string): Promise<IPlaybackInfo | void> {
    if (this.db === null) {
      throw new Error("You must run initialize() first!");
    }
    const db = this.db;
    const [contentManifest, contentsProtection]: [
      IStoredManifest?,
      IContentProtection[]?,
    ] = await PPromise.all([
      db.get("manifests", contentID),
      db
      .transaction("contentsProtection", "readonly")
      .objectStore("contentsProtection")
      .index("contentID")
      .getAll(IDBKeyRange.only(contentID)),
    ]);
    if (contentManifest === undefined || contentManifest.manifest === null) {
      throw new SegmentConstuctionError(
        `No Manifest found for current content ${contentID}`
      );
    }
    const {
      progress,
      duration,
      manifest,
    } = contentManifest;
    const contentProtection = getKeySystemsSessionsOffline(contentsProtection);

    if (contentProtection === undefined) {
      return {
        getManifest() {
          return offlineManifestLoader(
            manifest,
            getBuilderFormattedForAdaptations(contentManifest),
            getBuilderFormattedForSegments(contentManifest),
            { contentID, duration, isFinished: progress.percentage === 100, db }
          );
        },
       };
      }
    return {
      getManifest() {
      return offlineManifestLoader(
        manifest,
        getBuilderFormattedForAdaptations(contentManifest),
        getBuilderFormattedForSegments(contentManifest),
        { contentID, duration, isFinished: progress.percentage === 100, db }
      );
    },
    keySystems: [{
      type: contentProtection.type,
      persistentStateRequired: true,
      persistentLicense: true,
      licenseStorage: {
        load() {
          return contentProtection.sessionsIDS;
        },
        save() {
          return;
        },
      },
      getLicense() {
        return null;
      },
    }],
  };
}

  /**
   * Delete an entry partially or fully downloaded and stop the download
   * if the content is downloading, stop the download and delete it.
   * @param {string} contentID
   * @returns {Promise.<void>}
   */
  async deleteContent(contentID: string): Promise<void> {
    const activeDownloads = this.activeDownloads;
    const activePauses = this.activePauses;
    const db = this.db;
    if (db == null) {
      throw new Error("You must run initialize() first!");
    }
    if (activeDownloads[contentID] != null && activePauses[contentID] != null) {
      activePauses[contentID].next();
      activePauses[contentID].complete();
      activeDownloads[contentID].unsubscribe();
      delete activeDownloads[contentID];
      delete activePauses[contentID];
    }
    const indexTxSEG = db
      .transaction("segments", "readwrite")
      .objectStore("segments")
      .index("contentID");
    let cursor = await indexTxSEG.openCursor(IDBKeyRange.only(contentID));
    while (cursor !== null) {
      await cursor.delete();
      cursor = await cursor.continue();
    }
    const indexTxDRM = db
      .transaction("contentsProtection", "readwrite")
      .objectStore("contentsProtection")
      .index("contentID");
    let cursorDRM = await indexTxDRM.openCursor(IDBKeyRange.only(contentID));
    while (cursorDRM !== null) {
      await cursorDRM.delete();
      cursorDRM = await cursorDRM.continue();
    }
    await db.delete("manifests", contentID);
  }
}

export default ContentDownloader;
