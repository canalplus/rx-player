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
 * Check if one of given video codecs are supported for decode.
 * These video codecs are chose for their wide proven compatibility and
 * popularity.
 * @returns {string}
 */
export declare function findDefaultVideoCodec(): string;
/**
 * Check if one of given audio codecs are supported for decode.
 * These audio codecs are chose for their wide proven compatibility and
 * popularity.
 * @returns {string}
 */
export declare function findDefaultAudioCodec(): string;
