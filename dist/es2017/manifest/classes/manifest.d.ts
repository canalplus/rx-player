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
import { MediaError } from "../../errors";
import type { IParsedManifest } from "../../parsers/manifest";
import type { ITrackType, IRepresentationFilter, IPlayerError } from "../../public_types";
import EventEmitter from "../../utils/event_emitter";
import type { IAdaptationMetadata, IManifestMetadata, IPeriodMetadata, IRepresentationMetadata } from "../types";
import { ManifestMetadataFormat } from "../types";
import type Adaptation from "./adaptation";
import type { IManifestAdaptations } from "./period";
import Period from "./period";
import type { ICodecSupportList } from "./representation";
import type Representation from "./representation";
import type { IPeriodsUpdateResult } from "./update_periods";
/** Options given to the `Manifest` constructor. */
interface IManifestParsingOptions {
    /** External callback peforming an automatic filtering of wanted Representations. */
    representationFilter?: IRepresentationFilter | undefined;
    /** Optional URL that points to a shorter version of the Manifest used
     * for updates only. When using this URL for refresh, the manifest will be
     * updated with the partial update type. If this URL is undefined, then the
     * manifest will be updated fully when it needs to be refreshed, and it will
     * fetched through the original URL. */
    manifestUpdateUrl?: string | undefined;
}
/** Representation affected by a `decipherabilityUpdate` event. */
export interface IDecipherabilityUpdateElement {
    manifest: IManifestMetadata;
    period: IPeriodMetadata;
    adaptation: IAdaptationMetadata;
    representation: IRepresentationMetadata;
}
/** Events emitted by a `Manifest` instance */
export interface IManifestEvents {
    /** The Manifest has been updated */
    manifestUpdate: IPeriodsUpdateResult;
    /** Some Representation's decipherability status has been updated */
    decipherabilityUpdate: IDecipherabilityUpdateElement[];
}
/**
 * Normalized Manifest structure.
 *
 * Details the current content being played:
 *   - the duration of the content
 *   - the available tracks
 *   - the available qualities
 *   - the segments defined in those qualities
 *   - ...
 * while staying agnostic of the transport protocol used (Smooth, DASH etc.).
 *
 * The Manifest and its contained information can evolve over time (like when
 * updating a dynamic manifest or when right management forbid some tracks from
 * being played).
 * To perform actions on those changes, any module using this Manifest can
 * listen to its sent events and react accordingly.
 *
 * @class Manifest
 */
export default class Manifest extends EventEmitter<IManifestEvents> implements IManifestMetadata {
    manifestFormat: ManifestMetadataFormat.Class;
    /**
     * ID uniquely identifying this Manifest.
     * No two Manifests should have this ID.
     * This ID is automatically calculated each time a `Manifest` instance is
     * created.
     */
    readonly id: string;
    /**
     * Type of transport used by this Manifest (e.g. `"dash"` or `"smooth"`).
     *
     * TODO This should never be needed as this structure is transport-agnostic.
     * But it is specified in the Manifest API. Deprecate?
     */
    transport: string;
    /**
     * List every Period in that Manifest chronologically (from start to end).
     * A Period contains information about the content available for a specific
     * period of time.
     */
    readonly periods: Period[];
    /**
     * When that promise resolves, the whole Manifest needs to be requested again
     * so it can be refreshed.
     */
    expired: Promise<void> | null;
    /**
     * Deprecated. Equivalent to `manifest.periods[0].adaptations`.
     * @deprecated
     */
    adaptations: IManifestAdaptations;
    /**
     * If true, the Manifest can evolve over time:
     * New segments can become available in the future, properties of the manifest
     * can change...
     */
    isDynamic: boolean;
    /**
     * If true, this Manifest describes a live content.
     * A live content is a specific kind of content where you want to play very
     * close to the maximum position (here called the "live edge").
     * E.g., a TV channel is a live content.
     */
    isLive: boolean;
    /**
     * If `true`, no more periods will be added after the current last manifest's
     * Period.
     * `false` if we know that more Period is coming or if we don't know.
     */
    isLastPeriodKnown: boolean;
    uris: string[];
    /** Optional URL that points to a shorter version of the Manifest used
     * for updates only. */
    updateUrl: string | undefined;
    /**
     * Suggested delay from the "live edge" (i.e. the position corresponding to
     * the current broadcast for a live content) the content is suggested to start
     * from.
     * This only applies to live contents.
     */
    suggestedPresentationDelay: number | undefined;
    /**
     * Amount of time, in seconds, this Manifest is valid from the time when it
     * has been fetched.
     * If no lifetime is set, this Manifest does not become invalid after an
     * amount of time.
     */
    lifetime: number | undefined;
    /**
     * Minimum time, in seconds, at which a segment defined in the Manifest
     * can begin.
     * This is also used as an offset for live content to apply to a segment's
     * time.
     */
    availabilityStartTime: number | undefined;
    /**
     * It specifies the wall-clock time when the manifest was generated and published
     * at the origin server. It is present in order to identify different versions
     * of manifest instances.
     */
    publishTime: number | undefined;
    clockOffset: number | undefined;
    /**
     * Data allowing to calculate the minimum and maximum seekable positions at
     * any given time.
     */
    timeBounds: {
        /**
         * This is the theoretical minimum playable position on the content
         * regardless of the current Adaptation chosen, as estimated at parsing
         * time.
         * `undefined` if unknown.
         *
         * More technically, the `minimumSafePosition` is the maximum between all
         * the minimum positions reachable in any of the audio and video Adaptation.
         *
         * Together with `timeshiftDepth` and the `maximumTimeData` object, this
         * value allows to compute at any time the minimum seekable time:
         *
         *   - if `timeshiftDepth` is not set, the minimum seekable time is a
         *     constant that corresponds to this value.
         *
         *    - if `timeshiftDepth` is set, `minimumSafePosition` will act as the
         *      absolute minimum seekable time we can never seek below, even when
         *      `timeshiftDepth` indicates a possible lower position.
         *      This becomes useful for example when playing live contents which -
         *      despite having a large window depth - just begun and as such only
         *      have a few segment available for now.
         *      Here, `minimumSafePosition` would be the start time of the initial
         *      segment, and `timeshiftDepth` would be the whole depth that will
         *      become available once enough segments have been generated.
         */
        minimumSafePosition?: number | undefined;
        /**
         * Some dynamic contents have the concept of a "window depth" (or "buffer
         * depth") which allows to set a minimum position for all reachable
         * segments, in function of the maximum reachable position.
         *
         * This is justified by the fact that a server might want to remove older
         * segments when new ones become available, to free storage size.
         *
         * If this value is set to a number, it is the amount of time in seconds
         * that needs to be substracted from the current maximum seekable position,
         * to obtain the minimum seekable position.
         * As such, this value evolves at the same rate than the maximum position
         * does (if it does at all).
         *
         * If set to `null`, this content has no concept of a "window depth".
         */
        timeshiftDepth: number | null;
        /** Data allowing to calculate the maximum playable position at any given time. */
        maximumTimeData: {
            /**
             * Current position representing live content.
             * Only makes sense for un-ended live contents.
             *
             * `undefined` if unknown or if it doesn't make sense in the current context.
             */
            livePosition: number | undefined;
            /**
             * Whether the maximum positions should evolve linearly over time.
             *
             * If set to `true`, the maximum seekable position continuously increase at
             * the same rate than the time since `time` does.
             */
            isLinear: boolean;
            /**
             * This is the theoretical maximum playable position on the content,
             * regardless of the current Adaptation chosen, as estimated at parsing
             * time.
             *
             * More technically, the `maximumSafePosition` is the minimum between all
             * attributes indicating the duration of the content in the Manifest.
             *
             * That is the minimum between:
             *   - The Manifest original attributes relative to its duration
             *   - The minimum between all known maximum audio positions
             *   - The minimum between all known maximum video positions
             *
             * This can for example be understood as the safe maximum playable
             * position through all possible tacks.
             */
            maximumSafePosition: number;
            /**
             * `Monotically-increasing timestamp used by the RxPlayer at the time both
             * `maximumSafePosition` and `livePosition` were calculated.
             * This can be used to retrieve a new maximum position from them when they
             * linearly evolves over time (see `isLinear` property).
             */
            time: number;
        };
    };
    /**
     * Construct a Manifest instance from a parsed Manifest object (as returned by
     * Manifest parsers) and options.
     *
     * Some minor errors can arise during that construction. `warnings`
     * will contain all such errors, in the order they have been encountered.
     * @param {Object} parsedManifest
     * @param {Object} options
     * @param {Array.<Object>} warnings - After construction, will be optionally
     * filled by errors expressing minor issues seen while parsing the Manifest.
     */
    constructor(parsedManifest: IParsedManifest, options: IManifestParsingOptions, warnings: IPlayerError[]);
    /**
     * Some environments (e.g. in a WebWorker) may not have the capability to know
     * if a mimetype+codec combination is supported on the current platform.
     *
     * Calling `refreshCodecSupport` manually with a clear list of codecs supported
     * once it has been requested on a compatible environment (e.g. in the main
     * thread) allows to work-around this issue.
     *
     * @param {Array.<Object>} supportList
     * @returns {Error|null} - Refreshing codec support might reveal that some
     * `Adaptation` don't have any of their `Representation`s supported.
     * In that case, an error object will be created and returned, so you can
     * e.g. later emit it as a warning through the RxPlayer API.
     */
    refreshCodecSupport(supportList: ICodecSupportList): MediaError | null;
    /**
     * Returns the Period corresponding to the given `id`.
     * Returns `undefined` if there is none.
     * @param {string} id
     * @returns {Object|undefined}
     */
    getPeriod(id: string): Period | undefined;
    /**
     * Returns the Period encountered at the given time.
     * Returns `undefined` if there is no Period exactly at the given time.
     * @param {number} time
     * @returns {Object|undefined}
     */
    getPeriodForTime(time: number): Period | undefined;
    /**
     * Returns the first Period starting strictly after the given time.
     * Returns `undefined` if there is no Period starting after that time.
     * @param {number} time
     * @returns {Object|undefined}
     */
    getNextPeriod(time: number): Period | undefined;
    /**
     * Returns the Period coming chronologically just after another given Period.
     * Returns `undefined` if not found.
     * @param {Object} period
     * @returns {Object|null}
     */
    getPeriodAfter(period: Period): Period | null;
    /**
     * Returns the most important URL from which the Manifest can be refreshed.
     * `undefined` if no URL is found.
     * @returns {Array.<string>}
     */
    getUrls(): string[];
    /**
     * Update the current Manifest properties by giving a new updated version.
     * This instance will be updated with the new information coming from it.
     * @param {Object} newManifest
     */
    replace(newManifest: Manifest): void;
    /**
     * Update the current Manifest properties by giving a new but shorter version
     * of it.
     * This instance will add the new information coming from it and will
     * automatically clean old Periods that shouldn't be available anymore.
     *
     * /!\ Throws if the given Manifest cannot be used or is not sufficient to
     * update the Manifest.
     * @param {Object} newManifest
     */
    update(newManifest: Manifest): void;
    /**
     * Returns the theoretical minimum playable position on the content
     * regardless of the current Adaptation chosen, as estimated at parsing
     * time.
     * @returns {number}
     */
    getMinimumSafePosition(): number;
    /**
     * Get the position of the live edge - that is, the position of what is
     * currently being broadcasted, in seconds.
     * @returns {number|undefined}
     */
    getLivePosition(): number | undefined;
    /**
     * Returns the theoretical maximum playable position on the content
     * regardless of the current Adaptation chosen, as estimated at parsing
     * time.
     */
    getMaximumSafePosition(): number;
    /**
     * Look in the Manifest for Representations linked to the given key ID,
     * and mark them as being impossible to decrypt.
     * Then trigger a "decipherabilityUpdate" event to notify everyone of the
     * changes performed.
     * @param {Function} isDecipherableCb
     */
    updateRepresentationsDeciperability(isDecipherableCb: (content: {
        manifest: Manifest;
        period: Period;
        adaptation: Adaptation;
        representation: Representation;
    }) => boolean | undefined): void;
    /**
     * @deprecated only returns adaptations for the first period
     * @returns {Array.<Object>}
     */
    getAdaptations(): Adaptation[];
    /**
     * @deprecated only returns adaptations for the first period
     * @returns {Array.<Object>}
     */
    getAdaptationsForType(adaptationType: ITrackType): Adaptation[];
    /**
     * @deprecated only returns adaptations for the first period
     * @returns {Array.<Object>}
     */
    getAdaptation(wantedId: number | string): Adaptation | undefined;
    /**
     * Format the current `Manifest`'s properties into a
     * `IManifestMetadata` format which can better be communicated through
     * another thread.
     *
     * Please bear in mind however that the returned object will not be updated
     * when the current `Manifest` instance is updated, it is only a
     * snapshot at the current time.
     *
     * If you want to keep that data up-to-date with the current `Manifest`
     * instance, you will have to do it yourself.
     *
     * @returns {Object}
     */
    getMetadataSnapshot(): IManifestMetadata;
    /**
     * @param {Object} newManifest
     * @param {number} updateType
     */
    private _performUpdate;
}
export { IManifestParsingOptions };
