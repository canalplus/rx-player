import { IDBPDatabase } from "idb";
import { addFeatures, IFeature } from "../../../features";
import { setUpDb } from "./api/db/dbSetUp";
import DownloadManager from "./api/downloader/downloadManager";
import {
  getBuilderFormattedForAdaptations,
  getBuilderFormattedForSegments,
  getKeySystemsSessionsOffline,
  createLocalManifestFromStoredInformation,
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
  assertValidContentId,
  isPersistentLicenseSupported,
  SegmentConstuctionError,
} from "./utils";

function generateIdBase() {
  return (
    Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 15)
  );
}

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
  static addParsers(parsersList: IFeature[]): void {
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
  private nextContentIdSuffix: number;

  constructor() {
    this.dbName = "d2g-RxPlayer";
    this.activeDownloads = {};
    this.activePauses = {};
    this.db = null;
    this.nextContentIdSuffix = 0;
  }

  /**
   * Initialize the download environment.
   * Must be invocated at the beginning in order to store segment.
   * @returns {Promise<void>}
   */
  public async initialize(): Promise<void> {
    const db = await setUpDb(this.dbName);
    const nbDownload = await db.count("manifests");
    this.nextContentIdSuffix = nbDownload;
    this.db = db;
  }

  /**
   * Start a content download.
   * @param {Object} options
   * @returns {number} contentId - Return the id generated for the content.
   */
  public download(options: IDownloadArguments): number {
    try {
      if (this.db === null) {
        throw new Error("You must run initialize() first!");
      }
      if (typeof options !== "object" || Object.keys(options).length < 0) {
        throw new Error("You must at least specify these arguments: url, transport");
      }

      const { metadata, transport, url } = options;
      if (url === null || url === undefined || url === "") {
        throw new Error("You must specify the url of the manifest");
      }

      const db = this.db;
      const contentId = generateIdBase() + String(this.nextContentIdSuffix);
      this.nextContentIdSuffix++;

      this.activePauses[contentId] = pause$;
      const downloadManager = new DownloadManager(db);

      const initDownloadSub = downloadManager
        .initDownload({ ...options, contentId }, pause$)
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
              contentId,
              transport,
              manifest,
              builder: { video, audio, text },
              progress,
              size,
              duration: manifest.getMaximumPosition() - manifest.getMinimumPosition(),
              metadata,
            })
              .then(() => {
                if (progress.percentage === 100) {
                  options.onFinished?.();
                }
              })
              .catch((err: Error) => {
                if (err instanceof Error) {
                  return options?.onError?.(err);
                }
              });
          },
          (err) => {
            if (err instanceof Error) {
              return options?.onError?.(err);
            }
          },
        );
      this.activeDownloads[contentId] = initDownloadSub;
      return contentId;
    } catch (err) {
      if (err instanceof Error) {
        return options?.onError?.(err);
      }
    }
    return contentId;
  }

  /**
   * Resume a download already started earlier.
   * @param {string} contentId
   * @returns {Promise.<void>}
   */
  async resume(contentId: string, callbacks?: ICallbacks): Promise<void> {
    try {
      if (this.db === null) {
        throw new Error("You must run initialize() first!");
      }
      const db = this.db;
      if (contentId == null || contentId === "") {
        throw new Error("You must specify a valid contentId for resuming.");
      }
      const storedManifest = (await db.get("manifests", contentId)) as IStoredManifest;
      assertResumeADownload(storedManifest, this.activeDownloads);
      const pause$ = new AsyncSubject<void>();
      this.activePauses[contentId] = pause$;
      const downloadManager = new DownloadManager(db);
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
              contentId,
              transport,
              manifest,
              builder: { video, audio, text },
              progress,
              size,
              duration,
              metadata,
            })
              .then(() => {
                if (progress.percentage === 100) {
                  callbacks?.onFinished?.();
                }
              })
              .catch((err) => {
                if (err instanceof Error) {
                  return callbacks?.onError?.(err);
                }
              });
          },
          (err) => {
            if (err instanceof Error) {
              return callbacks?.onError?.(err);
            }
          },
        );
      this.activeDownloads[contentId] = resumeDownloadSub;
    } catch (err) {
      if (err instanceof Error) {
        return callbacks?.onError?.(err);
      }
    }
  }

  /**
   * Pause a download already started earlier.
   * @param {string} contentId
   * @returns {void}
   */
  pause(contentId: string): void {
    assertValidContentId(contentId);
    const activeDownloads = this.activeDownloads;
    const activePauses = this.activePauses;
    if (activeDownloads[contentId] == null || activePauses[contentId] == null) {
      throw new Error(`Invalid contentId given: ${contentId}`);
    }
    activePauses[contentId].next();
    activePauses[contentId].complete();
    activeDownloads[contentId].unsubscribe();
    delete activeDownloads[contentId];
    delete activePauses[contentId];
  }

  /**
   * Get all the downloaded entry (manifest) partially or fully downloaded.
   * @returns {Promise.<IAvailableContent[]>}
   */
  getAvailableContents(limit?: number): Promise<IAvailableContent[]> | undefined {
    return new Promise((resolve, reject) => {
      if (this.db === null) {
        return reject(new Error("You must run initialize() first!"));
      }

      return resolve(
        this.db
          .getAll("manifests", undefined, limit)
          .then((manifests: IStoredManifest[]) => {
            return manifests.map(
              ({ contentId, metadata, size, duration, progress, url, transport }) => ({
                id: contentId,
                metadata,
                size,
                duration,
                progress: progress.percentage,
                isFinished: progress.percentage === 100,
                url,
                transport,
              }),
            );
          }),
      );
    });
  }

  /**
   * Get a single content ready to be played by the rx-player,
   * could be fully or partially downloaded.
   * @param {string} contentId
   * @returns {Promise.<IPlaybackInfo|void>}
   */
  async getPlaybackInfo(contentId: string): Promise<IPlaybackInfo | void> {
    if (this.db === null) {
      throw new Error("You must run initialize() first!");
    }
    const db = this.db;
    const [contentManifest, contentsProtection]: [
      IStoredManifest?,
      IContentProtection[]?,
    ] = await Promise.all([
      db.get("manifests", contentId),
      db
        .transaction("contentsProtection", "readonly")
        .objectStore("contentsProtection")
        .index("contentId")
        .getAll(IDBKeyRange.only(contentId)),
    ]);
    if (contentManifest === undefined || contentManifest.manifest === null) {
      throw new SegmentConstuctionError(
        `No Manifest found for current content ${contentId}`,
      );
    }
    const { progress, duration, manifest } = contentManifest;
    const contentProtection = getKeySystemsSessionsOffline(contentsProtection);

    if (contentProtection === undefined) {
      return {
        getManifest() {
          return createLocalManifestFromStoredInformation(
            manifest,
            getBuilderFormattedForAdaptations(contentManifest),
            getBuilderFormattedForSegments(contentManifest),
            { contentId, duration, isFinished: progress.percentage === 100, db },
          );
        },
      };
    }
    return {
      getManifest() {
        return createLocalManifestFromStoredInformation(
          manifest,
          getBuilderFormattedForAdaptations(contentManifest),
          getBuilderFormattedForSegments(contentManifest),
          { contentId, duration, isFinished: progress.percentage === 100, db },
        );
      },
      keySystems: [
        {
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
        },
      ],
    };
  }

  /**
   * Delete an entry partially or fully downloaded and stop the download
   * if the content is downloading, stop the download and delete it.
   * @param {string} contentId
   * @returns {Promise.<void>}
   */
  async deleteContent(contentId: string): Promise<void> {
    const activeDownloads = this.activeDownloads;
    const activePauses = this.activePauses;
    const db = this.db;
    if (db == null) {
      throw new Error("You must run initialize() first!");
    }
    if (activeDownloads[contentId] != null && activePauses[contentId] != null) {
      activePauses[contentId].next();
      activePauses[contentId].complete();
      activeDownloads[contentId].unsubscribe();
      delete activeDownloads[contentId];
      delete activePauses[contentId];
    }
    const indexTxSEG = db
      .transaction("segments", "readwrite")
      .objectStore("segments")
      .index("contentId");
    let cursor = await indexTxSEG.openCursor(IDBKeyRange.only(contentId));
    while (cursor !== null) {
      await cursor.delete();
      cursor = await cursor.continue();
    }
    const indexTxDRM = db
      .transaction("contentsProtection", "readwrite")
      .objectStore("contentsProtection")
      .index("contentId");
    let cursorDRM = await indexTxDRM.openCursor(IDBKeyRange.only(contentId));
    while (cursorDRM !== null) {
      await cursorDRM.delete();
      cursorDRM = await cursorDRM.continue();
    }
    await db.delete("manifests", contentId);
  }
}

export { DASH } from "../../../features/list/dash";
export { SMOOTH } from "../../../features/list/smooth";
export default ContentDownloader;
