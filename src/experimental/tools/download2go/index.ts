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
import { IActiveSubs, IPauseSubject } from "./apis/dash/types";
import {
  IAddMovie,
  IEventsEmitter,
  IOptionsStarter,
  IProgressBarBuilderAbstract,
  IPublicAPI,
  IStoredManifest,
} from "./types";

export default async function D2G({
  nameDB = "d2g",
  storeManifestEvery,
}: IOptionsStarter = {}): Promise<IPublicAPI> {
  const emitter = new EventEmitter<IEventsEmitter>();
  const db = await setUpDb(nameDB);
  if (!db) {
    throw new IndexDBError("A problem occured during the set up of IndexDB");
  }
  const activeSubsDownloader: IActiveSubs = {};
  const activePauseSubject: IPauseSubject = {};

  return {
    emitter,
    async download(settings: IAddMovie): Promise<any> {
      try {
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
        activePauseSubject[contentID] = pause$;
        const subcriptionDownloader = downloader(
          { ...settings, type: "start" },
          {
            activeSubsDownloader,
            pause$,
            progress$,
            progressBarBuilder,
            size,
          },
          { db, emitter, storeManifestEvery }
        );
        activeSubsDownloader[contentID] = subcriptionDownloader;
      } catch (e) {
        emitter.trigger("error", {
          action: "download",
          contentID: settings.dbSettings.contentID,
          error: e || new Error("A Unexpected error happened"),
        });
        return undefined;
      }
    },
    async resume(contentID: string): Promise<void> {
      try {
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
          { db, emitter, storeManifestEvery }
        );
        activeSubsDownloader[contentID] = subcriptionDownloader;
      } catch (e) {
        emitter.trigger("error", {
          action: "resume",
          contentID,
          error: e || new Error("A Unexpected error happened"),
        });
      }
    },
    pause(contentID: string): number | void {
      try {
        checkForPauseAMovie(contentID);
        if (activeSubsDownloader[contentID] && activePauseSubject[contentID]) {
          activePauseSubject[contentID].next();
          activePauseSubject[contentID].complete();
          activeSubsDownloader[contentID].unsubscribe();
          delete activeSubsDownloader[contentID];
          activePauseSubject[contentID].unsubscribe();
          delete activePauseSubject[contentID];
          return 1;
        }
        return 2;
      } catch (e) {
        emitter.trigger("error", {
          action: "resume",
          contentID,
          error: e || new Error("A Unexpected error happened"),
        });
      }
    },
    async getAllDownloadedMovies<T>(): Promise<T[] | void> {
      try {
        return await db.getAll("manifests");
      } catch (e) {
        emitter.trigger("error", {
          action: "getAllDownloadedMovies",
          error: new IndexDBError(e.message),
        });
        return undefined;
      }
    },
    async getSingleMovie<T>(contentID: string): Promise<T | void> {
      try {
        const movie = await db.get("manifests", contentID);
        const encryption = await db.get("drm", contentID);
        if (!movie) {
          throw new Error(
            "A content doesnt exist with the given contentID: " + contentID
          );
        }
        return {
          ...movie,
          ...encryption,
          rxpManifest: constructOfflineManifest(movie.rxpManifest, db),
        };
      } catch (e) {
        emitter.trigger("error", {
          action: "getSingleMovie",
          contentID,
          error: e || new Error("A Unexpected error happened"),
        });
      }
    },
    async deleteDownloadedMovie(contentID: string): Promise<number | void> {
      try {
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
        await db.delete("drm", contentID);
        await db.delete("manifests", contentID);
        return 1;
      } catch (e) {
        emitter.trigger("error", {
          action: "deleteDownloadedMovie",
          contentID,
          error: e || new Error("A Unexpected error happened"),
        });
        return undefined;
      }
    },
  };
}
