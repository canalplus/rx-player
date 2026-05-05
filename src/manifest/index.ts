import type {
  IUpdatedRepresentationInfo,
  ICodecSupportInfo,
  Period,
  Adaptation,
  Representation,
  ISegment,
  IPeriodsUpdateResult,
  IRepresentationIndex,
  IMetaPlaylistPrivateInfos,
  IPrivateInfos,
  IThumbnailTrack,
} from "./classes/index.ts";
import type Manifest from "./classes/index.ts";
import { areSameContent, getLoggableSegmentId } from "./classes/index.ts";

/** Type of a `Manifest` class. */
export type IManifest = Manifest;

/** Type of a `Period` class. */
export type IPeriod = Period;

/** Type of an `Adaptation` class. */
export type IAdaptation = Adaptation;

/** Type of a `Representation` class. */
export type IRepresentation = Representation;

export type {
  IUpdatedRepresentationInfo,
  ICodecSupportInfo,
  IPeriodsUpdateResult,
  IRepresentationIndex,
  ISegment,
  IMetaPlaylistPrivateInfos,
  IPrivateInfos,
  IThumbnailTrack,
};
export { areSameContent, getLoggableSegmentId };
export type {
  IManifestMetadata,
  IPeriodMetadata,
  IAdaptationMetadata,
  IRepresentationMetadata,
} from "./types.ts";
export { ManifestMetadataFormat } from "./types.ts";
export * from "./utils.ts";
