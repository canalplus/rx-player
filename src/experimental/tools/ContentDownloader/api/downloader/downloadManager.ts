import { IDBPDatabase } from "idb";

import { SegmentFetcherCreator } from "../../../../../core/fetchers";
import { CancellationSignal } from "../../../../../utils/task_canceller";
import { ICallbacks, IInitSettings, IStoredManifest } from "../../types";
import { initDownloader$ } from "./initSegment";
import { getTransportPipelineFromTransport } from "./manifest";
import { segmentPipelineDownloader$ } from "./segment";

interface IDownloadInfo {
  pause(): void;
}

/**
 * DownloadManager that will handle actions to take depending if we are in
 * resuming or downloading from scratch.
 */
class DownloadManager {
  readonly db: IDBPDatabase;
  private _currentDownloads: Map<string, IDownloadInfo>;

  constructor(db: IDBPDatabase) {
    this.db = db;
  }

  public initDownload(initSettings: IInitSettings) {
    const { contentId, onError, onProgress } = initSettings;
    const builderInit = {
      progress: { percentage: 0, segmentsDownloaded: 0, totalSegments: 0 },
      manifest: null,
      video: [],
      audio: [],
      text: [],
      size: 0,
    };
    const pipelineSegmentDownloader$ = segmentPipelineDownloader$(
      initDownloader$(initSettings, this.db),
      builderInit,
      { contentId, onError, onProgress, db: this.db, pause$ },
    );
    return combineLatest([
      pipelineSegmentDownloader$.pipe(
        tap(({ progress: { percentage }, size }) => {
          onProgress?.({ progress: percentage, size });
        }),
        // TODO: See what we can do here with, this define the frequency of save
        filter(({ progress: { percentage } }) => percentage % 10 === 0),
        startWith(null),
      ),
      pause$.pipe(startWith(null)),
    ]);
  }

  pauseDownload(contentId: string): void {}

  resumeDownload(
    resumeSettings: IStoredManifest,
    callbacks: ICallbacks,
    cancelSignal: CancellationSignal,
  ) {
    const {
      progress,
      manifest,
      builder: { video, audio, text },
      contentId,
      transport,
      size,
    } = resumeSettings;
    const onError = callbacks?.onError;
    const onProgress = callbacks?.onProgress;
    const segmentFetcherCreator = new SegmentFetcherCreator(
      getTransportPipelineFromTransport(transport),
      {
        lowLatencyMode: false,
        maxRetryOffline: 5,
        maxRetryRegular: 5,

        // XXX TODO
        requestTimeout: undefined,
      },
      cancelSignal,
    );
    const builderInit = {
      progress,
      manifest,
      video,
      audio,
      text,
      size,
    };
    const pipelineSegmentDownloader$ = segmentPipelineDownloader$(
      of({
        progress,
        video,
        audio,
        text,
        manifest,
        segmentFetcherCreator,
        type: "resume",
      }),
      builderInit,
      { contentId, db: this.db, pause$, onError },
    );
    return combineLatest([
      pipelineSegmentDownloader$.pipe(
        tap(({ progress: { percentage }, size: progressSize }) =>
          onProgress?.({ progress: percentage, size: progressSize }),
        ),
        // TODO: See what we can do here with, this define the frequency of save
        filter(({ progress: { percentage } }) => percentage % 10 === 0),
        startWith(null),
      ),
      pause$.pipe(startWith(null)),
    ]);
  }
}

export default DownloadManager;
