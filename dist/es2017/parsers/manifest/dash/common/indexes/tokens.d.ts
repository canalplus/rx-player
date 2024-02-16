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
/**
 * @param {string} urlTemplate
 * @param {string|undefined} representationId
 * @param {number|undefined} bitrate
 * @returns {string}
 */
export declare function constructRepresentationUrl(urlTemplate: string, representationId?: string, bitrate?: number): string;
/**
 * Replace "tokens" written in a given path (e.g. $RepresentationID$) by the corresponding
 * infos, taken from the given segment.
 * @param {string} path
 * @param {string|undefined} id
 * @param {number|undefined} bitrate
 * @returns {string}
 */
export declare function replaceRepresentationDASHTokens(path: string, id?: string, bitrate?: number): string;
/**
 * Create function allowing to replace "tokens" in a given DASH segment URL
 * (e.g. $Time$, which has to be replaced by the segment's start time) by the
 * right information.
 * @param {number|undefined} time
 * @param {number|undefined} nb
 * @returns {Function}
 */
export declare function createDashUrlDetokenizer(time: number | undefined, nb: number | undefined): (url: string) => string;
