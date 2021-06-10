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
  /**
   * Manifest is updated entirely thanks to a re-downloaded version of
   * the original manifest document.
   */
  Full,
  /**
   * Manifest is updated partially thanks to a shortened version
   * of the manifest document. The latter's URL might be different
   * from the original one.
   */
  Partial,
}

/** Every possible value for the Adaptation's `type` property. */
export type IAdaptationType = "video" | "audio" | "text" | "image";

export interface IHDRInformation {
  /**
   * It is the bit depth used for encoding color for a pixel.
   *
   * It is used to ask to the user agent if the color depth is supported by the
   * output device.
   */
  colorDepth?: number;
  /**
   * It is the HDR eotf. It is the transfer function having the video signal as
   * input and converting it into the linear light output of the display. The
   * conversion is done within the display device.
   *
   * It may be used here to ask the MediaSource if it supported.
   */
  eotf?: string;
  /**
   * It is the video color space used for encoding. An HDR content may not have
   * a wide color gamut.
   *
   * It may be used to ask about output device color space support.
   */
  colorSpace?: string;
}
