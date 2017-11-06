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
  range: Array<number|null>|null|undefined;
  media: string|null|undefined;
  indexRange?: Array<number|null>|undefined;
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

interface IAdaptationSmooth {
id?: string;
smoothProtection?: IContentProtectionSmooth|null;
type: string;
accessibility: string[];
index: IIndex;
representations: Array<IDictionary<string|number>>; // XXX TODO
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
  IContentProtectionSmooth,
}
