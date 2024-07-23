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
import type { ITaggedTrack } from "../manifest";
import type { IMediaErrorCode } from "./error_codes";
type ICodeWithAdaptationType = "BUFFER_APPEND_ERROR" | "BUFFER_FULL_ERROR" | "NO_PLAYABLE_REPRESENTATION" | "MANIFEST_INCOMPATIBLE_CODECS_ERROR";
/**
 * Error linked to the media Playback.
 *
 * @class MediaError
 * @extends Error
 */
export default class MediaError extends Error {
    readonly name: "MediaError";
    readonly type: "MEDIA_ERROR";
    readonly code: IMediaErrorCode;
    readonly tracksInfo: ITaggedTrack[] | undefined;
    fatal: boolean;
    private _originalMessage;
    /**
     * @param {string} code
     * @param {string} reason
     * @param {Object|undefined} [context]
     */
    constructor(code: ICodeWithAdaptationType, reason: string, context: {
        tracks: ITaggedTrack[] | undefined;
    });
    constructor(code: Exclude<IMediaErrorCode, ICodeWithAdaptationType>, reason: string, context?: {
        tracks?: undefined;
    } | undefined);
    /**
     * If that error has to be communicated through another thread, this method
     * allows to obtain its main defining properties in an Object so the Error can
     * be reconstructed in the other thread.
     * @returns {Object}
     */
    serialize(): ISerializedMediaError;
}
/** Serializable object which allows to create a `MediaError` later. */
export interface ISerializedMediaError {
    name: "MediaError";
    code: IMediaErrorCode;
    reason: string;
    tracks: ITaggedTrack[] | undefined;
}
export {};
//# sourceMappingURL=media_error.d.ts.map