import Manifest, {
  IDecipherabilityUpdateElement,
  ICodecSupportList,
  Period,
  Adaptation,
  Representation,
  ISegment,
  IPeriodsUpdateResult,
  IRepresentationIndex,
  IMetaPlaylistPrivateInfos,
  IPrivateInfos,
  areSameContent,
  getLoggableSegmentId,
} from "./classes";

/** Type of a `Manifest` class. */
export type IManifest = Manifest;

/** Type of a `Period` class. */
export type IPeriod = Period;

/** Type of an `Adaptation` class. */
export type IAdaptation = Adaptation;

/** Type of a `Representation` class. */
export type IRepresentation = Representation;

export type {
  IDecipherabilityUpdateElement,
  ICodecSupportList,
  IPeriodsUpdateResult,
  IRepresentationIndex,
  ISegment,
  IMetaPlaylistPrivateInfos,
  IPrivateInfos,
};
export {
  areSameContent,
  getLoggableSegmentId,
};
export * from "./types";
export * from "./utils";

