// Webpack-defined globals
declare const __DEV__: boolean;
declare const __LOGGER_LEVEL__: string;
declare const __FEATURES__ : {
  SMOOTH : boolean,
  DASH : boolean,
  DIRECTFILE : boolean,
  HTML_SAMI : boolean,
  HTML_SRT : boolean,
  HTML_TTML : boolean,
  HTML_VTT : boolean,
  NATIVE_SAMI : boolean,
  NATIVE_SRT : boolean,
  NATIVE_TTML : boolean,
  NATIVE_VTT : boolean,
};

// Map of string to anything
interface IDictionary<T> {
  [keyName : string] : T;
}
<<<<<<< HEAD
=======

interface HTMLVideoElement {
  webkitGenerateKeyRequest? : (key: string, initData : ArrayBuffer) => void;
}
interface HTMLMediaElement {
  webkitGenerateKeyRequest? : (key: string, initData : ArrayBuffer) => void;
}

// typescript does not seem to know that one
// TODO Complete documentation
// TODO open a ticket on their side?
// declare class VTTCue {
//   id: string;
//   startTime : number;
//   endTime : number;
//   size : number;
//   vertical : string;
//   align : string;
//   position : string;
//   positionAlign : string;
//   lineAlign : string;
//   constructor(start : number, end : number, cueText : string);
// }
declare class VTTCue {
  align : string;
  endTime : number;
  id : string;
  line : string;
  lineAlign : string;
  position : number|string;
  positionAlign : string;
  size : number|string;
  snapToLines : boolean;
  startTime : number;
  vertical : string;
  constructor(start : number, end : number, cueText : string);
}

// XXX TODO understand how I'm supposed to do that
declare function arrayFind<T>(arr : T[], predicate : (arg: T) => boolean) : T;

interface Dictionary<T> {
  [Key: string]: T;
}
>>>>>>> 3930e26... abr
