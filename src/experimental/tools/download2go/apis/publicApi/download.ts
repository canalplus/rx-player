/**
 * Copyright 2019 CANAL+ Group
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

import { Subject, Subscription } from "rxjs";

import { progressBuilder } from "../../utils";
import { downloadManagerSubscription } from "../dash/dashSegmentsBuilder";
import {
  IEmitterLoaderBuilder,
  IProgressBarBuilderDownload,
  ISettings,
} from "../dash/types";
import { IUtils } from "./../../types";

/**
 * A downloader that instanciate the event api and launch the downloadManager
 *
 * @param settings -
 * The settings that need the download manager depending if we are in resume or start mode
 * @param progressBuilderAssets -
 * The progressBuilder variables that are needed to construct the progress percentage
 * @param utils - Emitter and db instances
 * @returns The subscription of the observable
 *
 */
export function downloader(
  settings: ISettings,
  progressBuilderAssets: IProgressBarBuilderDownload,
  { db, emitter, storeManifestEvery }: IUtils
): Subscription {
  const {
    progressBarBuilder,
    progress$,
    pause$,
    activeSubsDownloader,
  } = progressBuilderAssets;
  let size = progressBuilderAssets.size;
  const contentID =
    settings.type === "start"
      ? settings.dbSettings.contentID
      : settings.contentID;
  const progressBarBuilder$ = new Subject<IEmitterLoaderBuilder>();
  const progressSetupUnsubFn = progressBarBuilder$.subscribe(
    loaderBuilder => {
      progressBuilder(loaderBuilder, progressBarBuilder);
      const progressInPercent =
        (progressBarBuilder.progress / progressBarBuilder.overall) * 100;
      progress$.next({
        progress: progressInPercent,
        progressBarBuilder,
        size: loaderBuilder.size ? (size += loaderBuilder.size) : (size += 0),
        status:
          loaderBuilder.segmentDownloaded === 0 ? "counting" : "processing",
      });
      if (progressInPercent === 100) {
        progressBarBuilder$.complete();
      }
    },
    err => {
      emitter.trigger("error", {
        action: "download",
        contentID,
        error: err,
      });
    },
    () => progress$.complete()
  );
  const downloaderManagerSub = downloadManagerSubscription(
    {
      activeSubsDownloader,
      pause$,
      progress$,
      progressSetupUnsubFn,
      settings,
    },
    { emitter, db, storeManifestEvery, progressBarBuilder$ }
  );
  return downloaderManagerSub;
}
