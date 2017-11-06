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

export {
  IHSSKeySystem,
  IHSSParserOptions,
}
