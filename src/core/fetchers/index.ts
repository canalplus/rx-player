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

import CdnPrioritizer from "./cdn_prioritizer";
import type {
  IManifestFetcherSettings,
  IManifestFetcherEvent,
  IManifestRefreshSettings,
} from "./manifest";
import ManifestFetcher from "./manifest";
import type { SegmentQueue, ISegmentQueueCreatorBackoffOptions } from "./segment";
import SegmentQueueCreator from "./segment";
import createThumbnailFetcher, { getThumbnailFetcherRequestOptions } from "./thumbnails";
import type { IThumbnailFetcher } from "./thumbnails";

export type {
  IManifestFetcherSettings,
  IManifestFetcherEvent,
  IManifestRefreshSettings,
  ISegmentQueueCreatorBackoffOptions,
  SegmentQueue,
  IThumbnailFetcher,
};
export {
  CdnPrioritizer,
  ManifestFetcher,
  SegmentQueueCreator,
  createThumbnailFetcher,
  getThumbnailFetcherRequestOptions,
};
