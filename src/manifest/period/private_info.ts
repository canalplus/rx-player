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
 * Supplementary information that can be used by the transport implementation
 * when loading a Period.
 * It is named "private" because this value won't be checked / modified by the
 * core logic. It is only used as a storage which can be exploited by the
 * parser and transport protocol implementation.
 */
export default interface IPeriodPrivateInfo {
  metaplaylist? : IMetaPlaylistPeriodPrivateInfo;
}

/**
 * Supplementary information defined for LoadedPeriod/PartialPeriod in the
 * `metaplaylist` transport.
 */
export interface IMetaPlaylistPeriodPrivateInfo {
  /** Transport protocol for this content (e.g. "dash", "smooth" etc.) */
  transportType : string;
}
