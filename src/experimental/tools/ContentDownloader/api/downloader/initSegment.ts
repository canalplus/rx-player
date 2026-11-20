import { IDBPDatabase } from "idb";
import CdnPrioritizer from "../../../../../core/fetchers/cdn_prioritizer";
import Manifest, {
  Adaptation,
  ISegment,
  Period,
  Representation,
} from "../../../../../manifest";
import { IHDRInformation, IPlayerError } from "../../../../../public_types";
import { ISegmentContext } from "../../../../../transports";
import { CancellationSignal } from "../../../../../utils/task_canceller";
import logger from "../../../mediaCapabilitiesProber/log";
import createLocalSegmentFetcher from "../../fetch_segment";
import { IInitSettings } from "../../types";
import { getTransportPipelineFromTransport, loadManifest } from "./manifest";
import { IStoredManifestInfo } from "./types";

interface IRepresentationContext {
  period: Period;
  adaptation: Adaptation;
  representation: Representation;
}

export interface IContentDownloaderExposedPeriod {
  /** Start time in seconds at which the Period starts. */
  start: number;
  /**
   * End time in seconds at which the Period ends.
   * `undefined` if that end is unknown for now.
   */
  end: number | undefined;
  audioTracks: IContentDownloaderExposedAudioTrack[];
  videoTracks: IContentDownloaderExposedAudioTrack[];
  textTracks: IContentDownloaderExposedAudioTrack[];
}

export interface IContentDownloaderExposedAudioTrack {
  /** The language the audio track is in, as it is named in the Manifest. */
  language: string;
  /**
   * An attempt to translate `language` into a valid ISO639-3 language code.
   * Kept equal to `language` if the attempt failed.
   */
  normalized: string;
  audioDescription: boolean;
  dub?: boolean | undefined;
  label?: string | undefined;
  representations: IContentDownloaderExposedAudioRepresentation[];
}

export interface IContentDownloaderExposedAudioRepresentation {
  id: string;
  bitrate?: number | undefined;
  codec?: string | undefined;
}

export interface IContentDownloaderExposedTextTrack {
  /** The language the text track is in, as it is named in the Manifest. */
  language: string;
  /**
   * An attempt to translate `language` into a valid ISO639-3 language code.
   * Kept equal to `language` if the attempt failed.
   */
  normalized: string;
  forced: boolean | undefined;
  closedCaption: boolean;
  label?: string | undefined;
  representations: IContentDownloaderExposedTextRepresentation[];
}

/**
 * Definition of a single video Representation as represented by the
 * RxPlayer.
 */
export interface IContentDownloaderExposedVideoRepresentation {
  id: string;
  bitrate?: number | undefined;
  width?: number | undefined;
  height?: number | undefined;
  codec?: string | undefined;
  frameRate?: number | undefined;
  hdrInfo?: IHDRInformation | undefined;
}

export interface IContentDownloaderExposedTextRepresentation {
  id: string;
}

/** Video track returned by the RxPlayer. */
export interface IContentDownloaderExposedVideoTrack {
  signInterpreted?: boolean | undefined;
  isTrickModeTrack?: boolean | undefined;
  trickModeTracks?: IContentDownloaderExposedVideoTrack[] | undefined;
  label?: string | undefined;
  representations: IContentDownloaderExposedVideoRepresentation[];
}

export interface IContentDownloaderRepresentationFilterPayload {
  periods: IContentDownloaderExposedPeriod[];
}

export type IContentDownloaderRepresentationFilter = (
  payload: IContentDownloaderRepresentationFilterPayload,
) => string[];

function filterWantedRepresentations(
  manifest: Manifest,
  filter: IContentDownloaderRepresentationFilter | undefined,
): IRepresentationContext[] {
  const repIdToCtxt = new Map();
  const allRepresentations = manifest.periods.map((period) => {
    const periodObj: IContentDownloaderExposedPeriod = {
      start: period.start,
      end: period.end,
      audioTracks: [],
      videoTracks: [],
      textTracks: [],
    };
    (["video", "audio", "text"] as const).forEach((typ) => {
      const adaptationsForType = period.adaptations[typ];
      if (adaptationsForType === undefined) {
        periodObj.tracks[typ] = adaptationsForType.map((adaptation) => {
          switch (typ) {
            case "video":
              break;
            case "audio":
              break;
            case "text":
              break;
          }
        });
      }
    });
    return period.adaptations.video;
  });
}

interface IInitializedContentInfo {
  ctxts: IRepresentationContext[];
}

export interface IPendingDownloadInfo {
  representationUid: string;
  context: ISegmentContext;
  segments: ISegment[];
  initSegmentTimescale: number | undefined;
}

export type IContentStoredStatus =
  /**
   * Some entries may have been inserted through the current storage
   * technology (e.g. `IndexedDB`) but not enough to be able to actually
   * pause and resume the download.
   *
   * If this status is seen initially after reading the storage, it means that
   * a download has been interrupted too early and thus has to be restarted from
   * scratch (it cannot be resumed).
   * Its linked information should also probably be removed from the storage.
   */
  | "initialization"

  /**
   * This content is in the process of being removed from the storage.
   *
   * If this status is seen initially after reading the storage, it means that
   * a removal has been interrupted too early (e.g. by quitting the page) and
   * thus has to be continued.
   */
  | "removal"

  /**
   * This content is in the process of being downloaded. Under that status,
   * there is enough data to resume the download if it had been interrupted.
   */
  | "pending"

  /**
   * This content has been totally loaded, or at least we think so.
   */
  | "finished";

export interface IStoredContentObject {
  /** Unique identifier for that content. */
  contentId: string;
  /**
   * Stored manifest information, useful to then generate the corresponding
   * "local" Manifest readable by the RxPlayer.
   */
  manifest: IStoredManifestInfo;
  /**
   * Information on `Representation`s that may still need to be loaded.
   */
  pendingDownloadInfo: IPendingDownloadInfo[];
}

export interface IContentListObject {
  /** Unique identifier for that content. */
  contentId: string;
  /**
   * Characterize the "status" for that content, e.g. explaining if the content
   * has been fully loaded or not yet.
   */
  status: IContentStoredStatus;
  /**
   * Metadata choosen by the application to identify the content.
   */
  metadata: unknown;
}

function setContentInDb(
  db: IDBPDatabase,
  contentObj: IStoredContentObject,
): Promise<unknown> {
  return db.put("contents", contentObj);
}

/**
 * This function take care of downloading the init segment for VIDEO/AUDIO/TEXT
 * buffer type.
 * Then, he also find out the nextSegments we have to download.
 *
 * @param {Object} initSettings - Arguments we need to start the download.
 * @param {Object} db - The current opened IndexedDB database
 * @returns {}
 *
 */
export async function initializeContentDownload(
  initSettings: IInitSettings,
  db: IDBPDatabase,
  cancelSignal: CancellationSignal,
): Promise<IStoredContentObject> {
  const { contentId, url, transport, filters } = initSettings;
  const transportPipelines = getTransportPipelineFromTransport(transport);
  const manifest = await loadManifest(transportPipelines, [url], cancelSignal);
  const wantedRepresentations = filterWantedRepresentations(manifest, filters);

  const cdnPrioritizer = new CdnPrioritizer(cancelSignal);
  const fetchSegment = createLocalSegmentFetcher(transportPipelines, cdnPrioritizer, {
    // TODO configurable/in config?
    baseDelay: 250,
    maxDelay: 3000,
    maxRetry: 5,
    requestTimeout: 30,
  });

  const pendingDownloadInfo: IPendingDownloadInfo[] = [];

  // TODO some parallelization somewhere?
  for (const ctxt of wantedRepresentations) {
    const initSegment = ctxt.representation.index.getInitSegment();
    if (initSegment !== null) {
      const { period, adaptation, representation } = ctxt;
      const context = {
        segment: initSegment,
        cdnMetadata: representation.cdnMetadata,
        initTimescale: undefined,
        type: adaptation.type,
        language: adaptation.language,
        isLive: manifest.isLive,
        periodStart: period.start,
        periodEnd: period.end,
        mimeType: representation.mimeType,
        codecs: representation.codec,
        manifestPublishTime: manifest.publishTime,
      };
      const loadedInitSegment = await fetchSegment(
        context,
        (err: IPlayerError) => {
          logger.warn(
            "ContentDownloader: Retrying initialization segment request",
            representation.uniqueId,
            err,
          );
        },
        cancelSignal,
      );

      let initSegmentTimescale: number | undefined;
      for (const seg of loadedInitSegment) {
        if (seg.segmentType === "init") {
          if (seg.initTimescale !== undefined) {
            initSegmentTimescale = seg.initTimescale;
          }
          if (seg.segmentList !== undefined) {
            if (!representation.index.isInitialized()) {
              representation.index.initialize(seg.segmentList);
            }
          }
        }
      }

      const segments = representation.index.getSegments(0, Number.MAX_VALUE);
      const downloadInfo: IPendingDownloadInfo = {
        representationUid: representation.uniqueId,
        context,
        segments,
        initSegmentTimescale,
      };
      pendingDownloadInfo.push(downloadInfo);

      await db.put("segments", {
        contentId,
        key: `init/${contentId}/${ctxt.representation.uniqueId}`,
        data: loadedInitSegment,
      });
    }
  }
  const storedContent: IStoredContentObject = {
    contentId,
    // XXX TODO
    manifest: null,
    pendingDownloadInfo,
  };
  await setContentInDb(db, storedContent);
  return storedContent;
}
