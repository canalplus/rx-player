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

import { IContentInitializationData } from "../main";
import createAdaptiveRepresentationSelector, {
  IRepresentationEstimator,
} from "./core/adaptive/adaptive_representation_selector";
import { SegmentFetcherCreator } from "./core/fetchers";
import SegmentBuffersStore from "./core/segment_buffers";
import {
  limitVideoWidth,
  manualAudioBitrate,
  manualVideoBitrate,
  maxAudioBitrate,
  maxVideoBitrate,
  minAudioBitrate,
  minVideoBitrate,
  throttleVideo,
  throttleVideoBitrate,
} from "./globals";
import Manifest from "./manifest";
import MediaDurationUpdater from "./media_duration_updater";
import { ITransportPipelines } from "./transports";

export default class WorkerContentStore {
  private _currentContent : IPreparedContentData | null;

  constructor() {
    this._currentContent = null;
  }

  public setNewContent(
    // XXX TODO just what is needed?
    context : IContentInitializationData,
    pipelines : ITransportPipelines,
    manifest : Manifest,
    mediaSource : MediaSource
  ) : void {
    this.disposePreviousContent();
    const { contentId,
            lowLatencyMode,
            segmentRetryOptions } = context;
    const representationEstimator = createAdaptiveRepresentationSelector({
      initialBitrates: {
        audio: context.initialAudioBitrate,
        video: context.initialVideoBitrate,
      },
      lowLatencyMode,
      minAutoBitrates: {
        audio: minAudioBitrate,
        video: minVideoBitrate,
      },
      maxAutoBitrates: {
        audio: maxAudioBitrate,
        video: maxVideoBitrate,
      },
      manualBitrates: {
        audio: manualAudioBitrate,
        video: manualVideoBitrate,
      },
      throttlers: {
        limitWidth: { video: limitVideoWidth },
        throttle: { video: throttleVideo },
        throttleBitrate: { video: throttleVideoBitrate },
      },
    });

    const segmentFetcherCreator = new SegmentFetcherCreator(
      pipelines,
      { lowLatencyMode,
        maxRetryOffline: segmentRetryOptions.offline,
        maxRetryRegular: segmentRetryOptions.regular });
    const segmentBuffersStore = new SegmentBuffersStore(mediaSource);

    /** Maintains the MediaSource's duration up-to-date with the Manifest */
    const mediaDurationUpdater = new MediaDurationUpdater(manifest, mediaSource);

    this._currentContent = { contentId,
                             mediaSource,
                             manifest,
                             mediaDurationUpdater,
                             representationEstimator,
                             segmentBuffersStore,
                             segmentFetcherCreator };

  }

  public getCurrentContent() : IPreparedContentData | null {
    return this._currentContent;
  }

  public disposePreviousContent() {
    if (this._currentContent === null) {
      return;
    }
    this._currentContent.mediaDurationUpdater.stop();
    // clean-up every created SegmentBuffers
    this._currentContent.segmentBuffersStore.disposeAll();
  }
}

export interface IPreparedContentData {
  contentId : number;
  mediaSource : MediaSource;
  manifest : Manifest;
  mediaDurationUpdater : MediaDurationUpdater;
  representationEstimator : IRepresentationEstimator;
  segmentBuffersStore : SegmentBuffersStore;
  segmentFetcherCreator : SegmentFetcherCreator;
}
