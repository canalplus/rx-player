import type { IProcessedProtectionData } from "../main_thread/types";
import type { IManifest, IPeriod, IAdaptation, IPeriodsUpdateResult } from "../manifest";
import type { IAudioTrack, IRepresentationFilter, ITextTrack, ITrackType, IVideoTrack } from "../public_types";
import type { IAdaptationMetadata, IManifestMetadata, IPeriodMetadata, IRepresentationMetadata } from "./types";
/** List in an array every possible value for the Adaptation's `type` property. */
export declare const SUPPORTED_ADAPTATIONS_TYPE: ITrackType[];
/**
 * Returns the theoretical minimum playable position on the content
 * regardless of the current Adaptation chosen, as estimated at parsing
 * time.
 * @param {Object} manifest
 * @returns {number}
 */
export declare function getMinimumSafePosition(manifest: IManifestMetadata): number;
/**
 * Get the position of the live edge - that is, the position of what is
 * currently being broadcasted, in seconds.
 * @param {Object} manifest
 * @returns {number|undefined}
 */
export declare function getLivePosition(manifest: IManifestMetadata): number | undefined;
/**
 * Returns the theoretical maximum playable position on the content
 * regardless of the current Adaptation chosen, as estimated at parsing
 * time.
 * @param {Object} manifest
 * @returns {number}
 */
export declare function getMaximumSafePosition(manifest: IManifestMetadata): number;
/**
 * Returns Adaptations that contain Representations in supported codecs.
 * @param {string|undefined} type - If set filter on a specific Adaptation's
 * type. Will return for all types if `undefined`.
 * @returns {Array.<Adaptation>}
 */
export declare function getSupportedAdaptations(period: IPeriod, type?: ITrackType | undefined): IAdaptation[];
export declare function getSupportedAdaptations(period: IPeriodMetadata, type?: ITrackType | undefined): IAdaptationMetadata[];
/**
 * Returns the Period encountered at the given time.
 * Returns `undefined` if there is no Period exactly at the given time.
 * @param {Object} manifest
 * @param {number} time
 * @returns {Object|undefined}
 */
export declare function getPeriodForTime(manifest: IManifest, time: number): IPeriod | undefined;
export declare function getPeriodForTime(manifest: IManifestMetadata, time: number): IPeriodMetadata | undefined;
/**
 * Returns the Period coming chronologically just after another given Period.
 * Returns `undefined` if not found.
 * @param {Object} manifest
 * @param {Object} period
 * @returns {Object|null}
 */
export declare function getPeriodAfter(manifest: IManifest, period: IPeriod): IPeriod | null;
export declare function getPeriodAfter(manifest: IManifestMetadata, period: IPeriodMetadata): IPeriodMetadata | null;
/**
 * Returns true if the give time is in the time boundaries of this `Period`.
 * @param {Object} period - The `Period` which we want to check.
 * @param {number} time
 * @param {object|null} nextPeriod - Period coming chronologically just
 * after in the same Manifest. `null` if this instance is the last `Period`.
 * @returns {boolean}
 */
export declare function periodContainsTime(period: IPeriodMetadata, time: number, nextPeriod: IPeriodMetadata | null): boolean;
/**
 * Returns every `Adaptations` (or `tracks`) linked to that Period, in an
 * Array.
 * @returns {Array.<Object>}
 */
export declare function getAdaptations(period: IPeriod): IAdaptation[];
export declare function getAdaptations(period: IPeriodMetadata): IAdaptationMetadata[];
/**
 * Format an `Adaptation`, generally of type `"audio"`, as an `IAudioTrack`.
 * @param {Object} adaptation
 * @param {boolean} filterPlayable - If `true` only "playable" Representation
 * will be returned.
 * @returns {Object}
 */
export declare function toAudioTrack(adaptation: IAdaptationMetadata, filterPlayable: boolean): IAudioTrack;
/**
 * Format an `Adaptation`, generally of type `"audio"`, as an `IAudioTrack`.
 * @param {Object} adaptation
 * @returns {Object}
 */
export declare function toTextTrack(adaptation: IAdaptationMetadata): ITextTrack;
/**
 * Format an `Adaptation`, generally of type `"video"`, as an `IAudioTrack`.
 * @param {Object} adaptation
 * @param {boolean} filterPlayable - If `true` only "playable" Representation
 * will be returned.
 * @returns {Object}
 */
export declare function toVideoTrack(adaptation: IAdaptationMetadata, filterPlayable: boolean): IVideoTrack;
export declare function toTaggedTrack(adaptation: IAdaptation): ITaggedTrack;
/**
 * Information on a Representation affected by a `decipherabilityUpdates` event.
 */
export interface IDecipherabilityStatusChangedElement {
    manifest: IManifestMetadata;
    period: IPeriodMetadata;
    adaptation: IAdaptationMetadata;
    representation: IRepresentationMetadata;
}
/**
 * Change the decipherability of Representations which have their key id in one
 * of the given Arrays:
 *
 *   - Those who have a key id listed in `whitelistedKeyIds` will have their
 *     decipherability updated to `true`
 *
 *   - Those who have a key id listed in `blacklistedKeyIds` will have their
 *     decipherability updated to `false`
 *
 *   - Those who have a key id listed in `delistedKeyIds` will have their
 *     decipherability updated to `undefined`.
 *
 * @param {Object} manifest
 * @param {Array.<Uint8Array>} whitelistedKeyIds
 * @param {Array.<Uint8Array>} blacklistedKeyIds
 * @param {Array.<Uint8Array>} delistedKeyIds
 */
export declare function updateDecipherabilityFromKeyIds(manifest: IManifestMetadata, updates: {
    whitelistedKeyIds: Uint8Array[];
    blacklistedKeyIds: Uint8Array[];
    delistedKeyIds: Uint8Array[];
}): IDecipherabilityStatusChangedElement[];
/**
 * Update decipherability to `false` to any Representation which is linked to
 * the given initialization data.
 * @param {Object} manifest
 * @param {Object} initData
 */
export declare function updateDecipherabilityFromProtectionData(manifest: IManifestMetadata, initData: IProcessedProtectionData): IDecipherabilityStatusChangedElement[];
/**
 *
 * TODO that function is kind of very ugly, yet should work.
 * Maybe find out a better system for Manifest updates.
 * @param {Object} baseManifest
 * @param {Object} newManifest
 * @param {Array.<Object>} updates
 */
export declare function replicateUpdatesOnManifestMetadata(baseManifest: IManifestMetadata, newManifest: Omit<IManifestMetadata, "periods">, updates: IPeriodsUpdateResult): void;
export declare function createRepresentationFilterFromFnString(fnString: string): IRepresentationFilter;
interface ITaggedAudioTrack {
    type: "audio";
    track: IAudioTrack;
}
interface ITaggedVideoTrack {
    type: "video";
    track: IVideoTrack;
}
interface ITaggedTextTrack {
    type: "text";
    track: ITextTrack;
}
export type ITaggedTrack = ITaggedAudioTrack | ITaggedVideoTrack | ITaggedTextTrack;
export {};
//# sourceMappingURL=utils.d.ts.map