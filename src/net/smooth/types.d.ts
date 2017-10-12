import {
  CustomSegmentLoader,
} from "../types";

export interface IHSSOptions {
  segmentLoader? : CustomSegmentLoader;
  suggestedPresentationDelay? : number;
  referenceDateTime? : number;
  minRepresentationBitrate? : number;
  keySystems? : (hex? : Uint8Array) => any[];
}
