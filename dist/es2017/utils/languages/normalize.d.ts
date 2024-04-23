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
interface IMinimalAudioTrackObject {
    language: string;
    isDub?: boolean;
    audioDescription?: boolean;
}
interface IMinimalTextTrackObject {
    language: string;
    closedCaption?: boolean;
}
interface INormalizedAudioTrackObject extends IMinimalAudioTrackObject {
    normalized: string;
    isDub?: boolean;
    audioDescription: boolean;
}
interface INormalizedTextTrackObject extends IMinimalTextTrackObject {
    normalized: string;
    closedCaption: boolean;
}
/**
 * Normalize language given.
 * Basically:
 *   - converts it to lowercase.
 *   - normalize "base" (what is before the possible first "-") to an ISO639-3
 *     compatible string.
 * @param {string} _language
 * @returns {string}
 */
declare function normalizeLanguage(_language: string): string;
/**
 * Normalize text track from a user given input into an object
 * with three properties:
 *   - language {string}: The language the user gave us
 *   - normalized {string}: An attempt to normalize the language into an
 *     ISO 639-3 code
 *   - closedCaption {Boolean}: Whether the track is a closed caption track
 * @param {Object|string|null|undefined} _language
 * @returns {Object|null|undefined}
 */
declare function normalizeTextTrack(_language: string | IMinimalTextTrackObject | null | undefined): INormalizedTextTrackObject | null | undefined;
/**
 * Normalize audio track from a user given input into an object
 * with the following properties:
 *   - language {string}: The language the user gave us
 *   - normalized {string}: An attempt to normalize the language into an
 *     ISO 639-3 code
 *   - audioDescription {Boolean}: Whether the track is a closed caption track
 *   - isDub {Boolean|undefined}: if true, this is a dub.
 * @param {Object|string|null|undefined} _language
 * @returns {Object|null|undefined}
 */
declare function normalizeAudioTrack(_language: string | IMinimalAudioTrackObject | null | undefined): INormalizedAudioTrackObject | null | undefined;
export default normalizeLanguage;
export { normalizeAudioTrack, normalizeTextTrack, INormalizedTextTrackObject, INormalizedAudioTrackObject, };
