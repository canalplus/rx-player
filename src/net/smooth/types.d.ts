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

import {
  CustomSegmentLoader,
} from "../types";

interface IHSSKeySystem {
  systemId : string;
  privateData : Uint8Array;
}

interface IHSSParserOptions {
  segmentLoader? : CustomSegmentLoader;
  suggestedPresentationDelay? : number;
  referenceDateTime? : number;
  minRepresentationBitrate? : number;
  keySystems? : (hex? : Uint8Array) => IHSSKeySystem[];
}

interface IHSSManifestSegment {
  ts : number;
  d? : number;
  r : number;
}

interface IInitialization {
  range?: Array<number|null>|null;
  media?: string|null;
  indexRange?: Array<number|null>;
}

interface IIndex {
  timeline: IHSSManifestSegment[];
  timescale: number;
  initialization?: IInitialization;
  indexType?: string;
}

interface IContentProtectionSmooth {
  keyId : string;
  keySystems: IHSSKeySystem[];
}

interface IRepresentationSmooth {
  bitrate: number;
  codecPrivateData: string;
  codecs?: string;
  mimeType?: string;
  id?: string|number;
  samplingRate?: number;
  bitsPerSample?: number;
  packetSize?: number;
  width?: number;
  height?: number;
  audiotag?: number;
  channels?: number;
}

interface IAdaptationSmooth {
id?: string;
smoothProtection?: IContentProtectionSmooth|null;
type: string;
accessibility: string[];
index: IIndex;
representations: IRepresentationSmooth[];
name: string|null;
language: string|null;
normalizedLanguage: string|null;
baseURL: string|null;
}

interface IPeriodSmooth {
duration: number;
adaptations: IAdaptationSmooth[];
laFragCount: number;
}

export {
  IIndex,
  IHSSKeySystem,
  IPeriodSmooth,
  IHSSParserOptions,
  IAdaptationSmooth,
  IHSSManifestSegment,
  IRepresentationSmooth,
  IContentProtectionSmooth,
};
