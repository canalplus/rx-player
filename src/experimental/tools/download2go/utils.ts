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

import { IDBPDatabase } from "idb";

import includes from "../../../utils/array_includes";
import {
  IActiveSubs,
  IEmitterLoaderBuilder,
  IProgressBarBuilder,
} from "./apis/dash/types";
import { ISettingsDownloader, IStoredManifest } from "./types";

/* tslint:disable */

/**
 * A utils class that extends Error object to have custom class errors
 */
export class SegmentConstuctionError extends Error {
  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, SegmentConstuctionError.prototype);
    this.name = "SegmentConstructionError";
  }
}

export class ValidationArgsError extends Error {
  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, ValidationArgsError.prototype);
    this.name = "ValidationArgsError";
  }
}

export class RxPlayerError extends Error {
  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, RxPlayerError.prototype);
    this.name = "RxPlayerError";
  }
}

export class IndexDBError extends Error {
  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, IndexDBError.prototype);
    this.name = "IndexDBError";
  }
}
/* tslint:enable */

/**
 * Check the presence and validity of ISettingsDownloader arguments
 *
 * @param ISettingsDownloader - The arguments that the user of the lib provided
 * @returns void
 *
 */
export async function checkForSettingsAddMovie(
  settings: ISettingsDownloader,
  db: IDBPDatabase,
  activeSubsDownloader: IActiveSubs
): Promise<void> {
  if (!settings.url) {
    throw new ValidationArgsError("URL of the MPD must be specified");
  }

  const { contentID } = settings.dbSettings;
  if (!contentID) {
    throw new ValidationArgsError("ContentID must be specified");
  }

  if (activeSubsDownloader[contentID]) {
    throw new ValidationArgsError(
      "The content must be resume instead of starting a new download"
    );
  }

  const contentMovie = await db.get("manifests", contentID);
  if (contentMovie) {
    throw new ValidationArgsError(
      "An entry with the same contentID is already present, contentID must be unique"
    );
  }
}

export function checkForResumeAPausedMovie(
  manifest: IStoredManifest,
  activeSubsDownloader: IActiveSubs
) {
  if (!manifest) {
    throw new ValidationArgsError(
      "No content has been found with the given contentID"
    );
  }

  if (activeSubsDownloader[manifest.contentID]) {
    throw new ValidationArgsError("The content is already downloading");
  }

  if (manifest.progress === 100) {
    throw new ValidationArgsError(
      "You can't resume a content that is already fully downloaded"
    );
  }
}

export function checkForPauseAMovie(contentID: string) {
  if (!contentID) {
    throw new ValidationArgsError(
      "A valid contentID is mandatory in case of pause"
    );
  }
}

/**
 * A progressBarBuilder, emit a eventName
 * 'progress' with the current progress of the download.
 *
 * @remarks
 * We can launch multiple Download function at the
 * same time so emit will also emit a contentID to know.
 *
 * @param emitter - The emitter object on we are emitting
 * @param contentID - The contentID unique by download
 * @param emitterLoaderBuilder - The id,totalSegments and
 * segmentDownladed for the current contentID movie download
 * @param IProgressBarBuilder - The object
 * where we stock the value to construct the progress bar
 * @returns number
 *
 */
export function progressBuilder(
  { id, totalSegments, segmentDownloaded }: IEmitterLoaderBuilder,
  progressBarBuilder: IProgressBarBuilder
): void {
  if (!includes(progressBarBuilder.downloadedID, id) && totalSegments) {
    progressBarBuilder.overall += totalSegments;
    progressBarBuilder.progress += segmentDownloaded;
    progressBarBuilder.downloadedID.push(id);
    return;
  }
  progressBarBuilder.progress += segmentDownloaded;
  return;
}
