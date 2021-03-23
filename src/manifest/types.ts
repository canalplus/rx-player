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

/** Enumerate the different ways a Manifest update can be done. */
export enum MANIFEST_UPDATE_TYPE {
  /** The full version of the Manifest has been re-downloaded.
   * The manifest has been loaded through the same URL used for loading
   * it originally.
   */
  Full,
  /** Only a shortened version of the Manifest has been downloaded.
   * The manifest has been loaded through the manifest update URL,
   * which is used only for fetching this version of the manifest.
   */
  Partial,
}

/** Every possible value for the Adaptation's `type` property. */
export type IAdaptationType = "video" | "audio" | "text" | "image";
