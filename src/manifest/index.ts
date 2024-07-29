import type {
  IDecipherabilityUpdateElement,
  ICodecSupportInfo,
  Period,
  Track,
  Representation,
  ISegment,
  IPeriodsUpdateResult,
  IRepresentationIndex,
  IMetaPlaylistPrivateInfos,
  IPrivateInfos,
} from "./classes";
import type Manifest from "./classes";
import { areSameContent, getLoggableSegmentId } from "./classes";

/** Type of a `Manifest` class. */
export type IManifest = Manifest;

/** Type of a `Period` class. */
export type IPeriod = Period;

/** Type of an `Track` class. */
export type ITrack = Track;

/** Type of a `Representation` class. */
export type IRepresentation = Representation;

export type {
  IDecipherabilityUpdateElement,
  ICodecSupportInfo,
  IPeriodsUpdateResult,
  IRepresentationIndex,
  ISegment,
  IMetaPlaylistPrivateInfos,
  IPrivateInfos,
};
export { areSameContent, getLoggableSegmentId };
export type {
  IManifestMetadata,
  IPeriodMetadata,
  IVariantStreamMetadata,
  ITrackMetadata,
  IRepresentationMetadata,
} from "./types";
export { ManifestMetadataFormat } from "./types";
export * from "./utils";
