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

import { IDBPDatabase } from "idb";
import { AsyncSubject, ReplaySubject } from "rxjs";

import { downloader } from "./apis/publicApi/download";
import { constructOfflineManifest } from "./apis/publicApi/offlineDownload";
import { setUpDb } from "./apis/transactionDB/dbSetUp";
import {
  checkForPauseAMovie,
  checkForResumeAPausedMovie,
  checkForSettingsAddMovie,
  IndexDBError,
} from "./utils";

import EventEmitter from "../../../utils/event_emitter";
import PPromise from "../../../utils/promise";
import { IActiveSubs, IPauseSubject } from "./apis/dash/types";
import {
  IDownload2GoEvents,
  IEmitterTrigger,
  IOptionsStarter,
  IProgressBarBuilderAbstract,
  ISettingsDownloader,
  IStoredManifest,
  IStoreManifestEveryFn,
} from "./types";

/**
 * Instanciate a D2G downloader.
 * @param {Object<{nameDB, storeManifestEvery}>} IOptionsStarter
 * @return {IPublicAPI} IPublicAPI
 */
class D2G extends EventEmitter<IDownload2GoEvents> {
  /**
   * An init function that you MUST use to instanciate the D2G.
   * https://stackoverflow.com/a/43433773/6826962
   *
   * @param  {Object<{nameDB, storeManifestEvery}>} IOptionsStarter
   * @returns {Promise.<D2G>}
   */
  static init(options: IOptionsStarter = {}): Promise<D2G> {
    return (async function() {
      const d2g = new D2G(options);
      await d2g.setUp(options.nameDB || "d2g");
      return d2g;
    })();
  }

  public readonly nameDB: string;
  public readonly storeManifestEvery: IStoreManifestEveryFn | undefined;
  private db: IDBPDatabase | undefined;
  private emitter: IEmitterTrigger<IDownload2GoEvents>;
  private activeSubsDownloader: IActiveSubs;
  private activePauseSubject: IPauseSubject;

  constructor(options: IOptionsStarter = {}) {
    super();
    this.nameDB = options.nameDB || "d2g";
    this.storeManifestEvery = options.storeManifestEvery;
    this.activeSubsDownloader = {};
    this.activePauseSubject = {};
    this.emitter = {
      trigger: (eventName, payload) => this.trigger(eventName, payload),
    };
  }

  /**
   * Setup async stuff.
   * @param {nameDB} string
   * @returns {Promise.<void>}
   */
  async setUp(nameDB: string) {
    const db = await setUpDb(nameDB);
    if (!db) {
      throw new IndexDBError("A problem occured during the set up of IndexDB");
    }
    this.db = db;
  }

  /**
   * Start a download from scratch.
   * @param {Object<ISettingsDownloader>} settings
   * @returns {Promise.<void>}
   */
  async download(settings: ISettingsDownloader): Promise<void> {
    try {
      const { activeSubsDownloader, storeManifestEvery, db } = this;
      if (!db) {
        throw new Error("The database doesnt exist!");
      }
      await checkForSettingsAddMovie(settings, db, activeSubsDownloader);
      const size = 0;
      const progressBarBuilder = {
        progress: 0,
        overall: 0,
        downloadedID: [],
      };
      const progress$ = new ReplaySubject<IProgressBarBuilderAbstract>(1);
      const pause$ = new AsyncSubject<void>();
      const { contentID } = settings.dbSettings;
      this.activePauseSubject[contentID] = pause$;
      const subcriptionDownloader = downloader(
        { ...settings, type: "start" },
        {
          activeSubsDownloader,
          pause$,
          progress$,
          progressBarBuilder,
          size,
        },
        { db, emitter: this.emitter, storeManifestEvery }
      );
      activeSubsDownloader[contentID] = subcriptionDownloader;
      this.trigger("progress", {
        contentID,
        progress: 0,
        size,
        status: "processing",
      });
    } catch (e) {
      this.trigger("error", {
        action: "download",
        contentID: settings.dbSettings.contentID,
        error: e || new Error("A Unexpected error happened"),
      });
    }
  }

  /**
   * Resume a download already started earlier.
   * @param {string} contentID
   * @returns {Promise.<void>}
   */
  async resume(contentID: string): Promise<void> {
    try {
      const {
        activeSubsDownloader,
        activePauseSubject,
        db,
        storeManifestEvery,
      } = this;
      if (!db) {
        throw new Error("The database doesnt exist!");
      }
      const manifest: IStoredManifest = await db.get("manifests", contentID);
      checkForResumeAPausedMovie(manifest, activeSubsDownloader);
      const size = manifest.size;
      const progressBarBuilder = manifest.progressBarBuilder;
      const progress$ = new ReplaySubject<IProgressBarBuilderAbstract>(1);
      const pause$ = new AsyncSubject<void>();
      const settings = {
        contentID,
        metaData: manifest.metaData,
        rxpManifest: manifest.rxpManifest,
      };
      activePauseSubject[contentID] = pause$;
      const subcriptionDownloader = downloader(
        { ...settings, type: "resume" },
        {
          activeSubsDownloader,
          pause$,
          progress$,
          progressBarBuilder,
          size,
        },
        { db, emitter: this.emitter, storeManifestEvery }
      );
      activeSubsDownloader[contentID] = subcriptionDownloader;
    } catch (e) {
      this.trigger("error", {
        action: "resume",
        contentID,
        error: e || new Error("A Unexpected error happened"),
      });
    }
  }

  /**
   * Pause a download already started earlier.
   * @param {string} contentID
   * @returns {void}
   */
  pause(contentID: string): void {
    try {
      checkForPauseAMovie(contentID);
      const { activePauseSubject, activeSubsDownloader } = this;
      if (activeSubsDownloader[contentID] && activePauseSubject[contentID]) {
        activePauseSubject[contentID].next();
        activePauseSubject[contentID].complete();
        activeSubsDownloader[contentID].unsubscribe();
        delete activeSubsDownloader[contentID];
        activePauseSubject[contentID].unsubscribe();
        delete activePauseSubject[contentID];
      }
    } catch (e) {
      this.trigger("error", {
        action: "resume",
        contentID,
        error: e || new Error("A Unexpected error happened"),
      });
    }
  }

  /**
   * Get all the downloaded entry (manifest) partially or fully downloaded.
   * @returns {Promise.<T[]|void>}
   */
  async getAllDownloadedMovies<T>(): Promise<T[] | void> {
    try {
      if (!this.db) {
        throw new Error("The database doesnt exist!");
      }
      return await this.db.getAll("manifests");
    } catch (e) {
      this.trigger("error", {
        action: "getAllDownloadedMovies",
        error: new IndexDBError(e.message),
      });
      return undefined;
    }
  }

  /**
   * Get a singleMovie ready to be played by the rx-player,
   * could be fully or partially downloaded.
   * @param {string} contentID
   * @returns {Promise.<T|void>}
   */
  async getSingleMovie<T>(contentID: string): Promise<T | void> {
    try {
      if (!this.db) {
        throw new Error("The database doesnt exist!");
      }
      const [movie, encryption] = await PPromise.all([
        this.db.get("manifests", contentID),
        this.db.get("drm", contentID),
      ]);
      if (!movie) {
        throw new Error(
          "A content doesnt exist with the given contentID: " + contentID
        );
      }
      return {
        ...movie,
        ...encryption,
        rxpManifest: constructOfflineManifest(movie.rxpManifest, this.db),
      };
    } catch (e) {
      this.trigger("error", {
        action: "getSingleMovie",
        contentID,
        error: e || new Error("A Unexpected error happened"),
      });
    }
  }

  /**
   * Delete an entry partially or fully downloaded and stop the download
   * if the content is downloading, then delete.
   * @param {string} contentID
   * @returns {Promise.<void>}
   */
  async deleteDownloadedMovie(contentID: string): Promise<void> {
    try {
      const { activePauseSubject, activeSubsDownloader, db } = this;
      if (!db) {
        throw new Error("The database doesnt exist!");
      }
      if (activeSubsDownloader[contentID] && activePauseSubject[contentID]) {
        activePauseSubject[contentID].next();
        activePauseSubject[contentID].complete();
        activeSubsDownloader[contentID].unsubscribe();
        delete activeSubsDownloader[contentID];
        activePauseSubject[contentID].unsubscribe();
        delete activePauseSubject[contentID];
      }
      const indexTx = db
        .transaction("segments", "readwrite")
        .objectStore("segments")
        .index("contentID");
      let cursor = await indexTx.openCursor(IDBKeyRange.only(contentID));
      while (cursor) {
        await cursor.delete();
        cursor = await cursor.continue();
      }
      await PPromise.all([
        db.delete("drm", contentID),
        db.delete("manifests", contentID),
      ]);
    } catch (e) {
      this.trigger("error", {
        action: "deleteDownloadedMovie",
        contentID,
        error: e || new Error("A Unexpected error happened"),
      });
    }
  }
}

export default D2G;
