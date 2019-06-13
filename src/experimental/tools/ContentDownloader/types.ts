import Manifest from "../../../manifest";
import { ILocalManifest } from "../../../parsers/manifest/local";
import { IKeySystemOption } from "../../../public_types";
import { IContentDownloaderRepresentationFilter } from "./api/downloader/initSegment";
import { IContextRicher } from "./api/downloader/types";

export interface IDownloadArguments extends Partial<ICallbacks> {
  url: string;
  transport: string;
  keySystems?: IKeySystemOption;
  metadata?: unknown; // Should be a valid JSON Object
  filters?: IContentDownloaderRepresentationFilter;
}

export interface ICallbacks {
  onProgress?: (evt: IProgressInfos) => void;
  onError?: (evt: Error) => void;
  onFinished?: () => void;
}

interface IProgressInfos {
  progress: number; // Percentage of progression (in terms of download) from 0 to 100
  size: number; // Size of the downloaded content at time T in bytes
}

export interface IStorageInfo {
  /** Total space available in that storage, in bytes. */
  total: number;
  /** Total number of bytes used in that storage. */
  used: number;
}

export interface IAvailableContent {
  id: string;
  metadata: unknown; // Should be a valid JSON Object
  size: number; // approximately the storage space taken by this content, in bytes
  duration: number; // Duration of the content (when played from start to end), in secs
  progress: number; // Percentage of progression (in terms of download) from 0 to 100
  isFinished: boolean; // `true` if the content is fully downloaded
  url: string; // original URL given for the download content
  transport: string; // original transport value for the downloaded content
}

export interface IPlaybackInfo {
  getManifest(): ILocalManifest; // type from RxPlayer
  keySystems?: IKeySystemOption[] | undefined;
}

export interface IInitSettings extends IDownloadArguments {
  contentId: string;
}

// ****

export interface IStoredManifest {
  url: string;
  contentId: string;
  transport: string;
  manifest: Manifest | null;
  builder: {
    video: IContextRicher[];
    audio: IContextRicher[];
    text: IContextRicher[];
  };
  progress: IProgressInformations;
  size: number;
  metadata?: unknown;
  duration: number;
}

export interface IProgressInformations {
  percentage: number;
  segmentsDownloaded: number;
  totalSegments: number;
}
