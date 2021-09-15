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

/** Manifest, as documented in the API documentation. */
export interface IExposedManifest {
  periods : IExposedPeriod[];
  /**
   * @deprecated
   */
  adaptations : { audio? : IExposedAdaptation[];
                  video? : IExposedAdaptation[];
                  text? : IExposedAdaptation[];
                  image? : IExposedAdaptation[]; };
  isLive : boolean;
  transport : string;
}

/** Period, as documented in the API documentation. */
export interface IExposedPeriod {
  id : string;
  start : number;
  end? : number | undefined;
  adaptations : { audio? : IExposedAdaptation[];
                  video? : IExposedAdaptation[];
                  text? : IExposedAdaptation[];
                  image? : IExposedAdaptation[]; };
}

/** Adaptation (represents a track), as documented in the API documentation. */
export interface IExposedAdaptation {
  /** String identifying the Adaptation, unique per Period. */
  id : string;
  type : "video" | "audio" | "text" | "image";
  language? : string | undefined;
  normalizedLanguage? : string | undefined;
  isAudioDescription? : boolean | undefined;
  isClosedCaption? : boolean | undefined;
  isTrickModeTrack? : boolean | undefined;
  representations : IExposedRepresentation[];

  getAvailableBitrates() : number[];
}

/** Representation (represents a quality), as documented in the API documentation. */
export interface IExposedRepresentation {
  /** String identifying the Representation, unique per Adaptation. */
  id : string;
  bitrate : number;
  /** Codec used by the segment in that Representation. */
  codec? : string | undefined;
  /**
   * Whether we are able to decrypt this Representation / unable to decrypt it or
   * if we don't know yet:
   *   - if `true`, it means that we know we were able to decrypt this
   *     Representation in the current content.
   *   - if `false`, it means that we know we were unable to decrypt this
   *     Representation
   *   - if `undefined` there is no certainty on this matter
   */
  decipherable? : boolean | undefined;
  /**
   * This property makes the most sense for video Representations.
   * It defines the height of the video, in pixels.
   */
  height? : number | undefined;
  /**
   * This property makes the most sense for video Representations.
   * It defines the height of the video, in pixels.
   */
  width? : number | undefined;
  /**
   * The represesentation frame rate for this Representation. It defines either
   * the number of frames per second as an integer (24), or as a ratio
   * (24000 / 1000).
   */
  frameRate? : string | undefined;
  /** If the track is HDR, gives the HDR characteristics of the content */
  hdrInfo? : IHDRInformation;
  index : IExposedRepresentationIndex;
}

interface IExposedRepresentationIndex {
  getSegments(up : number, duration : number) : IExposedSegment[];
}

/** Segment, as documented in the API documentation. */
export interface IExposedSegment {
  id : string;
  timescale : number;
  duration? : number | undefined;
  time : number;
  isInit? : boolean | undefined;
  range? : number[] | null | undefined;
  indexRange? : number[] | null | undefined;
  number? : number | undefined;
}
