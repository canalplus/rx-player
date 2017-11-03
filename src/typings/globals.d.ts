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
