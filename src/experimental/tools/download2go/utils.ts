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

import arrayIncludes from "../../../utils/array_includes";
import { IActiveDownload } from "./api/context/types";
import { IInitSettings, IStoredManifest } from "./types";

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
export async function checkInitDownloaderOptions(
  options: Omit<IInitSettings, "type">,
  db: IDBPDatabase,
  activeDownloads: IActiveDownload
): Promise<void> {
  if (
    !options ||
    typeof options !== "object" ||
    Object.keys(options).length < 0
  ) {
    throw new ValidationArgsError(
      "You must at least specify these arguments: { url, contentID, transport }"
    );
  }

  const { url, contentID, transport } = options;
  if (!url) {
    throw new ValidationArgsError("You must specify the url of the manifest");
  }

  if (!contentID) {
    throw new ValidationArgsError(
      "You must specify a contentID of the content you want to download"
    );
  }

  if (!transport || !arrayIncludes(["smooth", "dash"], transport)) {
    throw new ValidationArgsError(
      "You must specify a transport protocol, value possible: smooth - dash"
    );
  }

  if (activeDownloads[contentID]) {
    throw new ValidationArgsError(
      "The content must be resume instead of starting a new download"
    );
  }

  const contentMovie: IStoredManifest | null | undefined = await db.get(
    "manifests",
    contentID
  );
  if (contentMovie) {
    throw new ValidationArgsError(
      "An entry with the same contentID is already present, contentID must be unique"
    );
  }
}

export function checkForResumeAPausedMovie(
  manifest: IStoredManifest,
  activeDownloads: IActiveDownload
) {
  if (!manifest) {
    throw new ValidationArgsError(
      "No content has been found with the given contentID"
    );
  }

  if (activeDownloads[manifest.contentID]) {
    throw new ValidationArgsError("The content is already downloading");
  }

  if (manifest.progress.percentage === 100) {
    throw new ValidationArgsError(
      "You can't resume a content that is already fully downloaded"
    );
  }
}

export function checkForPauseAMovie(contentID: string) {
  if (!contentID) {
    throw new ValidationArgsError(
      "A valid contentID is mandatory when pausing"
    );
  }
}
