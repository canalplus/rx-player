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

import EventEmitter from "../../../utils/event_emitter";
import PPromise from "../../../utils/promise";

import { IActiveDownload, IActivePauses } from "./api/context/types";
import { setUpDb } from "./api/db/dbSetUp";
import DownloadManager from "./api/downloader/downloadManager";
import {
  getBuilderFormattedForAdaptations,
  getBuilderFormattedForSegments,
  getKeySystemsSessionsOffline,
  offlineManifestLoader,
} from "./api/downloader/manifest";
import { IContentProtection } from "./api/drm/types";
import {
  IApiLoader,
  IContentDownloaderEvents,
  IContentLoader,
  IEmitterTrigger,
  IGlobalSettings,
  IStoredManifest
} from "./types";
import {
  assertResumeADownload,
  checkInitDownloaderOptions,
  IndexedDBError,
  isPersistentLicenseSupported,
  isValidContentID,
  SegmentConstuctionError,
  ValidationArgsError,
} from "./utils";

/**
 * Instanciate a ContentDownloader
 *
 * @param {IGlobalSettings}
 * @return {IPublicAPI}
 */
class ContentDownloader extends EventEmitter<IContentDownloaderEvents> {
  /**
   * Detect if the current environment is supported for persistent licence
   *
   * @returns {boolean} - is supported
   *
   */
  static isPersistentLicenseSupported(): Promise<boolean> {
    return isPersistentLicenseSupported();
  }

  /**
   * Get informations on the storage usage of the navigator
   *
   * @returns {Object<{ total: number, used: number }>} -
   *  the space used and the total usable
   *
   */
  static async getStorageUsageInfos() {
    if (navigator.storage == null || navigator.storage.estimate == null) {
      return null;
    }
    const { quota, usage } = await navigator.storage.estimate();
    if (quota === undefined || usage === undefined) {
      return null;
    }
    return {
      total: quota / 1e6,
      used: usage / 1e6,
    };
  }

  public readonly dbName: string;
  private db: IDBPDatabase | null;
  private emitter: IEmitterTrigger<IContentDownloaderEvents>;
  private activeDownloads: IActiveDownload;
  private activePauses: IActivePauses;

  constructor(options: IGlobalSettings = {}) {
    super();
    this.dbName =
      options.dbName == null || options.dbName === ""
        ? "d2g-rxPlayer"
        : options.dbName;
    this.activeDownloads = {};
    this.activePauses = {};
    this.db = null;
    this.emitter = {
      trigger: (eventName, payload) => this.trigger(eventName, payload),
    };
  }

  /**
   * Initialize an IndexedDB instance.
   * @returns {Promise<void>}
   */
  initDB(): Promise<IDBPDatabase> {
    return new Promise((resolve, reject) => {
      setUpDb(this.dbName)
        .then(db => {
          this.db = db;
          resolve(db);
        })
        .catch((error) => {
          if (error instanceof Error) {
            this.trigger("error", { action: "initDB", error });
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
  async download(options: IApiLoader): Promise<string | void> {
    try {
      const db = this.db;
      if (db === null) {
        throw new Error("The IndexedDB database has not been created!");
      }
      const contentID = await checkInitDownloaderOptions(options, db);
      const { metaData, transport } = options;
      const pause$ = new AsyncSubject<void>();
      this.activePauses[contentID] = pause$;
      const downloadManager = new DownloadManager({
        emitter: this.emitter,
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
              contentID,
              transport,
              manifest,
              builder: { video, audio, text },
              progress,
              size,
              duration: manifest.getDuration(),
              metaData,
            }).then(() =>
              this.trigger("insertDB", {
                action: "store",
                contentID,
                progress: progress.percentage,
              })
            ).catch((err: Error) => {
              if (err instanceof Error) {
                this.trigger("error", {
                  action: "download",
                  error: err,
                  contentID,
                });
              }
            });
          },
          (error) => {
            if (error instanceof Error) {
              this.trigger("error", { action: "download", error, contentID });
            }
          }
        );
      this.activeDownloads[contentID] = initDownloadSub;
      return contentID;
    } catch (error) {
      if (error instanceof Error) {
        this.trigger("error", {
          action: "download",
          error,
        });
      }
    }
  }

  /**
   * Resume a download already started earlier.
   * @param {string} contentID
   * @returns {Promise.<void>}
   */
  async resume(contentID: string): Promise<void> {
    try {
      const db = this.db;
      if (db === null) {
        throw new Error("The IndexedDB database has not been created!");
      }
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
        emitter: this.emitter,
        db,
      });
      const resumeDownloadSub = downloadManager
        .resumeDownload(storedManifest, pause$)
        .subscribe(
          ([download]) => {
            if (download === null) {
              return;
            }
            const { progress, manifest, audio, video, text, size } = download;
            if (manifest === null) {
              return;
            }
            const { metaData, transport, duration } = storedManifest;
            db.put("manifests", {
              contentID,
              transport,
              manifest,
              builder: { video, audio, text },
              progress,
              size,
              duration,
              metaData,
            }).then(() =>
              this.trigger("insertDB", {
                action: "store",
                contentID,
                progress: progress.percentage,
              })
            ).catch((error) => {
              if (error instanceof Error) {
                this.trigger("error", {
                  action: "resume",
                  error,
                  contentID,
                });
              }
            });
          },
          (error) => {
            if (error instanceof Error) {
              this.trigger("error", {
                action: "resume",
                error,
                contentID,
              });
            }
          }
        );
      this.activeDownloads[contentID] = resumeDownloadSub;
    } catch (err) {
      if (err instanceof Error) {
        this.trigger("error", { action: "resume", error: err, contentID });
      }
    }
  }

  /**
   * Pause a download already started earlier.
   * @param {string} contentID
   * @returns {void}
   */
  pause(contentID: string): void {
    try {
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
    } catch (e) {
      if (e instanceof Error) {
        this.trigger("error", {
          action: "pause",
          contentID,
          error: e !== undefined ? e : new Error("A Unexpected error happened"),
        });
      }
    }
  }

  /**
   * Get all the downloaded entry (manifest) partially or fully downloaded.
   * @returns {Promise.<IStoredManifest[]|void>}
   */
  getAllLocalContent(
    limit?: number
  ): Promise<IStoredManifest[] | undefined> | void {
    try {
      if (this.db === null) {
        throw new Error("The IndexedDB database has not been created!");
      }
      // TODO: return formatted content ?
      return this.db.getAll("manifests", undefined, limit);
    } catch (e) {
      if (e instanceof Error) {
        this.trigger("error", {
          action: "getAllLocalContent",
          error: new IndexedDBError(e.message),
        });
      }
    }
  }

  /**
   * Get a single content ready to be played by the rx-player,
   * could be fully or partially downloaded.
   * @param {string} contentID
   * @returns {Promise.<IContentLoader|void>}
   */
  async getSingleContent(contentID: string): Promise<IContentLoader | void> {
    try {
      if (this.db === null) {
        throw new Error("The IndexedDB database has not been created!");
      }
      const [contentManifest, contentsProtection]: [
        IStoredManifest?,
        IContentProtection[]?,
      ] = await PPromise.all([
        this.db.get("manifests", contentID),
        this.db
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
        transport,
        size,
        metaData,
        manifest,
        duration,
      } = contentManifest;
      const contentProtection = getKeySystemsSessionsOffline(contentsProtection);

      return {
        progress,
        size,
        transport,
        contentID,
        metaData,
        contentProtection,
        offlineManifest: offlineManifestLoader(
          manifest,
          getBuilderFormattedForAdaptations(contentManifest),
          getBuilderFormattedForSegments(contentManifest),
          { contentID, duration, isFinished: progress.percentage === 100, db: this.db }
        ),
      };
    } catch (e) {
      if (e instanceof Error) {
      this.trigger("error", {
        action: "getSingleContent",
        contentID,
        error: e !== undefined ? e : new Error("A Unexpected error happened"),
      });
    }
  }
  }

  /**
   * Delete an entry partially or fully downloaded and stop the download
   * if the content is downloading, stop the download and delete it.
   * @param {string} contentID
   * @returns {Promise.<void>}
   */
  async deleteContent(contentID: string): Promise<void> {
    try {
      const activeDownloads = this.activeDownloads;
      const activePauses = this.activePauses;
      const db = this.db;
      if (db == null) {
        throw new Error("The IndexedDB database has not been created!");
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
    } catch (e) {
      if (e instanceof Error) {
      this.trigger("error", {
        action: "deleteContent",
        contentID,
        error: e !== undefined ? e : new Error("A Unexpected error happened"),
      });
    }
  }
}
}

export default ContentDownloader;
