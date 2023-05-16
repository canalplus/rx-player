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

import { Adaptation } from "../manifest";
import {
  IAudioTrack,
  ITextTrack,
  IVideoTrack,
} from "../public_types";
import {
  ErrorTypes,
  IMediaErrorCode,
} from "./error_codes";
import errorMessage from "./error_message";

interface IAudioTrackMediaErrorContext {
  type : "audio";
  track : IAudioTrack;
}

interface IVideoTrackMediaErrorContext {
  type : "video";
  track : IVideoTrack;
}

interface ITextTrackMediaErrorContext {
  type : "text";
  track : ITextTrack;
}

export type IMediaErrorTrackContext = IAudioTrackMediaErrorContext |
                                      IVideoTrackMediaErrorContext |
                                      ITextTrackMediaErrorContext;

type ICodeWithAdaptationType = "BUFFER_APPEND_ERROR" |
                               "BUFFER_FULL_ERROR" |
                               "NO_PLAYABLE_REPRESENTATION" |
                               "MANIFEST_INCOMPATIBLE_CODECS_ERROR";

/**
 * Error linked to the media Playback.
 *
 * @class MediaError
 * @extends Error
 */
export default class MediaError extends Error {
  public readonly name : "MediaError";
  public readonly type : "MEDIA_ERROR";
  public readonly message : string;
  public readonly code : IMediaErrorCode;
  public readonly tracksInfo : IMediaErrorTrackContext[] | undefined;
  public fatal : boolean;

  /**
   * @param {string} code
   * @param {string} reason
   * @param {Object|undefined} [context]
   */
  constructor(
    code : ICodeWithAdaptationType,
    reason : string,
    context: {
      adaptations : Adaptation[] | undefined;
    }
  );
  constructor(
    code : Exclude<IMediaErrorCode, ICodeWithAdaptationType>,
    reason : string,
  );
  constructor(
    code : IMediaErrorCode,
    reason : string,
    context? : {
      adaptations? : Adaptation[] | undefined;
    } | undefined
  ) {
    super();
    // @see https://stackoverflow.com/questions/41102060/typescript-extending-error-class
    Object.setPrototypeOf(this, MediaError.prototype);

    this.name = "MediaError";
    this.type = ErrorTypes.MEDIA_ERROR;

    this.code = code;
    this.message = errorMessage(this.name, this.code, reason);
    this.fatal = false;
    const adaptations = context?.adaptations;
    if (adaptations !== undefined && adaptations.length > 0) {
      this.tracksInfo = adaptations.reduce((
        acc: IMediaErrorTrackContext[],
        adaptation: Adaptation
      ) => {
        switch (adaptation.type) {
          case "audio":
            acc.push({ type: "audio",
                       track: adaptation.toAudioTrack(false) });
            break;
          case "video":
            acc.push({ type: "video",
                       track: adaptation.toVideoTrack(false) });
            break;
          case "text":
            acc.push({ type: "text",
                       track: adaptation.toTextTrack() });
            break;
        }
        return acc;
      }, []);
    }
  }
}
