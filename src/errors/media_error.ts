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

import type { ITaggedTrack } from "../manifest/index.ts";
import assert from "../utils/assert.ts";
import type { IMediaErrorCode } from "./error_codes.ts";
import { ErrorTypes } from "./error_codes.ts";
import errorMessage from "./error_message.ts";

export type ICodeWithAdaptationType =
  | "BUFFER_APPEND_ERROR"
  | "BUFFER_FULL_ERROR"
  | "NO_PLAYABLE_REPRESENTATION"
  | "MANIFEST_INCOMPATIBLE_CODECS_ERROR";

export type ICodeWithManifestPositionError =
  "MEDIA_TIME_BEFORE_MANIFEST" | "MEDIA_TIME_AFTER_MANIFEST";

interface ITimeInfo {
  position: number;
  minPosition: number;
  maxPosition: number;
}

/**
 * Error linked to the media Playback.
 *
 * @class MediaError
 * @extends Error
 */
export default class MediaError extends Error {
  public readonly name: "MediaError";
  public readonly type: "MEDIA_ERROR";
  public readonly code: IMediaErrorCode;
  public readonly tracksInfo: ITaggedTrack[] | undefined;
  public readonly timeInfo: ITimeInfo | undefined;
  public fatal: boolean;
  private _originalMessage: string;

  /**
   * @param {string} code
   * @param {string} reason
   * @param {Object|undefined} [context]
   */
  constructor(
    code: ICodeWithAdaptationType,
    reason: string,
    context: {
      tracks: ITaggedTrack[] | undefined;
    },
  );
  constructor(
    code: ICodeWithManifestPositionError,
    reason: string,
    context: {
      timeInfo: ITimeInfo;
    },
  );
  constructor(
    code: Exclude<
      IMediaErrorCode,
      ICodeWithAdaptationType | ICodeWithManifestPositionError
    >,
    reason: string,
  );
  constructor(
    code: IMediaErrorCode,
    reason: string,
    context?:
      | {
          tracks?: ITaggedTrack[] | undefined;
          timeInfo?: ITimeInfo;
        }
      | undefined,
  ) {
    super(errorMessage(code, reason));
    // @see https://stackoverflow.com/questions/41102060/typescript-extending-error-class
    Object.setPrototypeOf(this, MediaError.prototype);

    this.name = "MediaError";
    this.type = ErrorTypes.MEDIA_ERROR;
    this._originalMessage = reason;

    this.code = code;
    this.fatal = false;
    if (context?.tracks !== undefined && context?.tracks.length > 0) {
      this.tracksInfo = context.tracks;
    }
    if (context?.timeInfo !== undefined) {
      this.timeInfo = context.timeInfo;
    }
  }

  /**
   * If that error has to be communicated through another thread, this method
   * allows to obtain its main defining properties in an Object so the Error can
   * be reconstructed in the other thread.
   * @returns {Object}
   */
  public serialize(): ISerializedMediaError {
    return {
      isSerializedError: true,
      name: this.name,
      code: this.code,
      reason: this._originalMessage,
      tracks: this.tracksInfo,
      timeInfo: this.timeInfo,
    };
  }
}

/**
 * Re-create a `MediaError` from a serialized representation.
 * @param {Object} serializedMediaError
 * @returns {MediaError}
 */
export function deserializeMediaError(
  serializedMediaError: ISerializedMediaError,
): MediaError {
  if (
    serializedMediaError.code === "MEDIA_TIME_BEFORE_MANIFEST" ||
    serializedMediaError.code === "MEDIA_TIME_AFTER_MANIFEST"
  ) {
    assert(
      serializedMediaError.timeInfo !== undefined,
      `The MediaError with code ${serializedMediaError.code} does not provide "timeinfo"`,
    );
    return new MediaError(serializedMediaError.code, serializedMediaError.reason, {
      timeInfo: serializedMediaError.timeInfo,
    });
  }
  if (
    serializedMediaError.code === "BUFFER_APPEND_ERROR" ||
    serializedMediaError.code === "BUFFER_FULL_ERROR" ||
    serializedMediaError.code === "NO_PLAYABLE_REPRESENTATION" ||
    serializedMediaError.code === "MANIFEST_INCOMPATIBLE_CODECS_ERROR"
  ) {
    return new MediaError(serializedMediaError.code, serializedMediaError.reason, {
      tracks: serializedMediaError.tracks,
    });
  }
  return new MediaError(serializedMediaError.code, serializedMediaError.reason);
}

/** Serializable object which allows to create a `MediaError` later. */
export interface ISerializedMediaError {
  isSerializedError: true;
  name: "MediaError";
  code: IMediaErrorCode;
  reason: string;
  tracks: ITaggedTrack[] | undefined;
  timeInfo?: ITimeInfo | undefined;
}
