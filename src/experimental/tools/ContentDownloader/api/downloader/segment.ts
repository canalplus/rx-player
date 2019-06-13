import { IPrioritizedSegmentFetcher, SegmentFetcherCreator } from "../../../../../core/fetchers";
import { IInbandEvent } from "../../../../../core/stream";
import Manifest from "../../../../../manifest";
import { IPlayerError } from "../../../../../public_types";
import { IChunkTimeInfo } from "../../../../../transports";
import findIndex from "../../../../../utils/array_find_index";
import noop from "../../../../../utils/noop";
import { CancellationSignal } from "../../../../../utils/task_canceller";
import { IndexedDBError } from "../../utils";
import {
  IContext,
  IContextRicher,
  ICustomSegment,
  IInitGroupedSegments,
  IManifestDBState,
  IUtils,
} from "./types";

export interface IInitSegmentStoredData {
  segmentType: "init";
  segmentData: unknown;
}

export interface IMediaSegmentStoredData {
  segmentType: "media";
  /** Parsed chunk of data that can be decoded. */
  chunkData: unknown;
  /**
   * Time information on this parsed chunk.
   * `null` if unknown.
   */
  chunkInfos: IChunkTimeInfo | null;
  /**
   * time offset, in seconds, to add to the absolute timed data defined in
   * `chunkData` to obtain the "real" wanted effective time.
   *
   * For example:
   *   If `chunkData` announces (when parsed by the demuxer or decoder) that the
   *   segment begins at 32 seconds, and `chunkOffset` equals to `4`, then the
   *   segment should really begin at 36 seconds (32 + 4).
   *
   * Note that `chunkInfos` needs not to be offseted as it should already
   * contain the correct time information.
   */
  chunkOffset: number;
  /**
   * start and end windows for the segment (part of the chunk respectively
   * before and after that time will be ignored).
   * `undefined` when their is no such limitation.
   */
  appendWindow: [ number | undefined,
                  number | undefined ];
  /**
   * If set and not empty, then "events" have been encountered in this parsed
   * chunks.
   */
  inbandEvents: IInbandEvent[] | undefined;
}

export type ISegmentStoredData = IInitSegmentStoredData | IMediaSegmentStoredData;

export interface ILoadSegmentCallbacks {
  onRequestRetry(err: IPlayerError): void;
  onProtectionDataUpdate(): void;
}

export interface ILoadSegmentsCallbacks extends ILoadSegmentCallbacks {
  onParsedSegment(
    segmentInfo: IContext,
    parsed: ISegmentStoredData[]
  ): void;
}

export async function loadSingleSegment(
  segmentInfo: IContext,
  initTimescale: number | undefined,
  segmentFetcher: IPrioritizedSegmentFetcher<unknown>,
  callbacks: ILoadSegmentCallbacks,
  cancelSignal: CancellationSignal
): Promise<ISegmentStoredData[]> {
  const chunks: ISegmentStoredData[] = [];
  await segmentFetcher.createRequest(segmentInfo, 0, {
    onChunk(parse) {
      const parsed = parse(initTimescale);
      // For init segment...
      if (parsed.segmentType === "init") {
        const {
          initializationData,
          protectionDataUpdate,
        } = parsed;
        if (parsed.initTimescale !== undefined) {
          initTimescale = parsed.initTimescale;
        }
        if (protectionDataUpdate) {
          callbacks.onProtectionDataUpdate();
        }

        if (initializationData === null) {
          return;
        }

        chunks.push({
          segmentType: parsed.segmentType,
          segmentData: parsed.initializationData,
        });
      } else {
        // For simple segment
        const { chunkData,
                chunkInfos,
                chunkOffset,
                protectionDataUpdate,
                appendWindow,
                inbandEvents } = parsed;
        if (protectionDataUpdate) {
          callbacks.onProtectionDataUpdate();
        }
        if (chunkData === null) {
          return;
        }
        chunks.push({
          segmentType: parsed.segmentType,
          chunkData,
          chunkInfos,
          chunkOffset,
          appendWindow,
          inbandEvents,
        });
      }
    },
    onRetry(error) {
      callbacks.onRequestRetry(error);
    },
    onAllChunksReceived: noop,
    beforeEnded: noop,
    beforeInterrupted: noop,
  }, cancelSignal);
  return chunks;
}

/**
 * Downloads the given segments sequentially.
 * @param {Array.<Object>} segmentInfoArr - An array of segments context to download.
 * @param {Object} segmentFetcher
 * @param {Object} callbacks.
 * @returns {Promise}
 */
export async function loadMultipleSegments(
  segmentInfoArr: IContext[],
  segmentFetcher: IPrioritizedSegmentFetcher<unknown>,
  callbacks: ILoadSegmentsCallbacks,
  cancelSignal: CancellationSignal
): Promise<void> {
  // XXX TODO next segments (wait v4?)
  // const segmentFetcher = segmentFetcherCreator.createSegmentFetcher(
  //   trackType,
  //   {
  //     onRequestBegin: noop,
  //     onProgress: noop,
  //     onRequestEnd: noop,
  //     onMetrics: noop,
  //   }
  // );

  // XXX TODO
  let initTimescale : number | undefined;

  for (const segInfo of segmentInfoArr) {
    const parsed = await loadSingleSegment(
      segInfo,
      initTimescale,
      segmentFetcher,
      callbacks,
      cancelSignal
    );
    callbacks.onParsedSegment(segInfo, parsed);
  }
}

export interface ISegmentsDownloaderArguments {
  segmentFetcherCreator: SegmentFetcherCreator;
  manifest: Manifest;
  videoRepresentations: IContextRicher[];
  audioRepresentations: IContextRicher[];
  textRepresentations: IContextRicher[];
}

/**
 * The top level function downloader that should start the pipeline of
 * download for each buffer type (VIDEO/AUDIO/TEXT).
 *
 * @remarks
 * - It also store each segment downloaded in IndexedDB.
 * - Add the segment in the ProgressBarBuilder.
 * - Emit a global progress when a segment has been downloaded.
 * - Eventually, wait an event of the pause$ Subject to put the download in pause.
 *
 * @param Observable<IInitGroupedSegments> - A Observable that carry
 * all the data we need to start the download.
 * @param IManifestDBState - The current builder state of the download.
 * @param IUtils - Usefull tools to store/emit/pause the current content of the download.
 * @returns IManifestDBState - The state of the Manifest at the X time in the download.
 *
 */
export function segmentPipelineDownloader$(
  contentInfo: IInitGroupedSegments,
  { contentId, db, onError }: IUtils
): Promise<void> {
  const {
    video,
    audio,
    text,
    segmentFetcherCreator,
    manifest,
    progress,
    type,
  } = contentInfo;

  const videoSegmentsProm = loadMultipleSegments(
    video,
    segmentFetcher,
    callbacks,
    cancelSignal
  );
    tap(
      ({
        chunkData,
        representationID,
        ctx: {
          segment: { time, timescale },
        },
        trackType,
      }) => {
        const timeScaled = (time / timescale) * 1000;
        db.put("segments", {
          contentId,
          segmentKey: `${timeScaled}--${representationID}--${contentId}`,
          data: chunkData.data,
          size: chunkData.data.byteLength,
        }).catch((err: Error) => {
           onError?.(new IndexedDBError(`
            ${contentId}: Impossible
            to store the current segment (${trackType}) at ${timeScaled}: ${err.message}
          `));
        });
      }
    ),
    scan<ICustomSegment, IManifestDBState>(
      (
        acc,
        {
          progress,
          ctx,
          trackType,
          nextSegments,
          representationID,
          chunkData,
        }
      ) => {
        if (progress !== undefined) {
          acc.progress.totalSegments = progress.totalSegments;
        }
        acc.progress.segmentsDownloaded += 1;
        const percentage =
          (acc.progress.segmentsDownloaded / acc.progress.totalSegments) * 100;
        acc.progress.percentage = percentage > 98 && percentage < 100
        ? percentage
        : Math.round(percentage);
        acc.size += chunkData.data.byteLength;
        if (nextSegments === undefined) {
          return acc;
        }
        const indexRepresentation = findIndex(
          acc[trackType],
          ({ representation }) => representation.id === representationID
        );
        if (indexRepresentation === -1) {
          acc[trackType].push({
            nextSegments,
            period: ctx.period,
            adaptation: ctx.adaptation,
            representation: ctx.representation,
            id: representationID,
          });
          return { ...acc, manifest: ctx.manifest };
        }
        acc[trackType][indexRepresentation] = {
          nextSegments,
          period: ctx.period,
          adaptation: ctx.adaptation,
          representation: ctx.representation,
          id: representationID,
        };
        return { ...acc, manifest: ctx.manifest };
      },
      state
    ),
    distinct(({ progress }) => progress.percentage),
    takeUntil(pause$)
  );
}
