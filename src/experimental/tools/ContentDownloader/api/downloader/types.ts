import { IDBPDatabase } from "idb";
import { SegmentFetcherCreator } from "../../../../../core/fetchers";
import Manifest, {
  Adaptation,
  ISegment,
  Period,
  Representation,
} from "../../../../../manifest";
import { IContentProtections } from "../../../../../parsers/manifest";
import { ILocalIndexSegment } from "../../../../../parsers/manifest/local";
import { ICallbacks, IProgressInformations } from "../../types";

export type ContentBufferType = "video" | "audio" | "text";
export type DownloadType = "start" | "resume";

export interface IContext {
  manifest: Manifest;
  period: Period;
  adaptation: Adaptation;
  representation: Representation;
  segment: ISegment;
}
export interface IContextUniq {
  representation: Representation;
  adaptation: Adaptation;
  segment: ISegment;
}

export interface IContextBuilder {
  period: Period;
  contexts: IContextUniq[];
}

export interface IGlobalContext {
  video: IContextBuilder[];
  audio: IContextBuilder[];
  text: IContextBuilder[];
  manifest: Manifest;
}

export interface IContextRicher {
  nextSegments: ISegment[];
  period: Period;
  adaptation: Adaptation;
  representation: Representation;
  id: string;
  chunkData?: ISegmentData;
}

export interface IStoredManifestInfo {
  contentId: string;
  minimumPosition: number;
  maximumPosition: number;
  periods: IStoredPeriodInfo[];
}

export interface IStoredPeriodInfo {
  start: number;
  end?: number | undefined;
  adaptations: IStoredAdaptationInfo[];
}

export interface IStoredAdaptationInfo {
  type: ContentBufferType;
  audioDescription?: boolean;
  closedCaption?: boolean;
  language?: string;
  representations: IStoredRepresentationInfo[];
}

export interface IStoredRepresentationInfo {
  id: string;
  uniqueId: string;
  bitrate?: number | undefined;
  width?: number | undefined;
  height?: number | undefined;
  mimeType?: string | undefined;
  codec?: string | undefined;
  segments: ILocalIndexSegment[];
  // XXX TODO those of local manifest directly?
  contentProtections?: IContentProtections | undefined;
}

export interface IInitSegment {
  nextSegments: ISegment[];
  ctx: IContext;
  contentType: ContentBufferType;
  segmentFetcherCreator: SegmentFetcherCreator;
  chunkData?: ISegmentData;
}

export interface IInitGroupedSegments {
  progress: IProgressInformations;
  video: IContextRicher[];
  audio: IContextRicher[];
  text: IContextRicher[];
  segmentFetcherCreator: SegmentFetcherCreator | null;
  manifest: Manifest | null;
  type: DownloadType;
}

export interface ISegmentStored {
  contentId: string;
  segmentKey: string;
  data: BufferSource;
  size: number;
}

export interface IUtils extends ICallbacks {
  db: IDBPDatabase;
  contentId: string;
}

export interface IManifestDBState {
  progress: IProgressInformations;
  manifest: Manifest | null;
  video: IContextRicher[];
  audio: IContextRicher[];
  text: IContextRicher[];
  size: number;
}

export interface ISegmentData {
  data: Uint8Array;
  contentProtection?: Uint8Array;
}

export interface ICustomSegment {
  chunkData: ISegmentData;
  ctx: IContext;
  index: number;
  contentType: ContentBufferType;
  representationID: string;
  isInitData: boolean;
  nextSegments?: ISegment[];
  progress?: IProgressInformations;
  type: DownloadType;
}

export interface ISegmentPipelineContext {
  type: DownloadType;
  progress?: IProgressInformations;
  isInitData: boolean;
  segmentFetcherCreator: SegmentFetcherCreator;
  nextSegments?: ISegment[];
}

export interface IAbstractContextCreation {
  type: DownloadType;
  progress: IProgressInformations;
  segmentFetcherCreator: SegmentFetcherCreator;
  manifest: Manifest;
}

export interface IUtilsOfflineLoader {
  contentId: string;
  duration: number;
  isFinished: boolean;
  db: IDBPDatabase;
}
