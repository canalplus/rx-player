import type { IManifestStreamEvent, IParsedPeriod } from "../../parsers/manifest";
import type { ITrackType, IRepresentationFilter } from "../../public_types";
import type { IPeriodMetadata } from "../types";
import Adaptation from "./adaptation";
import type { ICodecSupportList } from "./representation";
/** Structure listing every `Adaptation` in a Period. */
export type IManifestAdaptations = Partial<Record<ITrackType, Adaptation[]>>;
/**
 * Class representing the tracks and qualities available from a given time
 * period in the the Manifest.
 * @class Period
 */
export default class Period implements IPeriodMetadata {
    /** ID uniquely identifying the Period in the Manifest. */
    readonly id: string;
    /** Every 'Adaptation' in that Period, per type of Adaptation. */
    adaptations: IManifestAdaptations;
    /** Absolute start time of the Period, in seconds. */
    start: number;
    /**
     * Duration of this Period, in seconds.
     * `undefined` for still-running Periods.
     */
    duration: number | undefined;
    /**
     * Absolute end time of the Period, in seconds.
     * `undefined` for still-running Periods.
     */
    end: number | undefined;
    /** Array containing every stream event happening on the period */
    streamEvents: IManifestStreamEvent[];
    /**
     * @constructor
     * @param {Object} args
     * @param {Array.<Object>} unsupportedAdaptations - Array on which
     * `Adaptation`s objects which have no supported `Representation` will be
     * pushed.
     * This array might be useful for minor error reporting.
     * @param {function|undefined} [representationFilter]
     */
    constructor(args: IParsedPeriod, unsupportedAdaptations: Adaptation[], representationFilter?: IRepresentationFilter | undefined);
    /**
     * Some environments (e.g. in a WebWorker) may not have the capability to know
     * if a mimetype+codec combination is supported on the current platform.
     *
     * Calling `refreshCodecSupport` manually with a clear list of codecs supported
     * once it has been requested on a compatible environment (e.g. in the main
     * thread) allows to work-around this issue.
     *
     * @param {Array.<Object>} supportList
     * @param {Array.<Object>} unsupportedAdaptations - Array on which
     * `Adaptation`s objects which are now known to have no supported
     * `Representation` will be pushed.
     * This array might be useful for minor error reporting.
     */
    refreshCodecSupport(supportList: ICodecSupportList, unsupportedAdaptations: Adaptation[]): void;
    /**
     * Returns every `Adaptations` (or `tracks`) linked to that Period, in an
     * Array.
     * @returns {Array.<Object>}
     */
    getAdaptations(): Adaptation[];
    /**
     * Returns every `Adaptations` (or `tracks`) linked to that Period for a
     * given type.
     * @param {string} adaptationType
     * @returns {Array.<Object>}
     */
    getAdaptationsForType(adaptationType: ITrackType): Adaptation[];
    /**
     * Returns the Adaptation linked to the given ID.
     * @param {number|string} wantedId
     * @returns {Object|undefined}
     */
    getAdaptation(wantedId: string): Adaptation | undefined;
    /**
     * Returns Adaptations that contain Representations in supported codecs.
     * @param {string|undefined} type - If set filter on a specific Adaptation's
     * type. Will return for all types if `undefined`.
     * @returns {Array.<Adaptation>}
     */
    getSupportedAdaptations(type?: ITrackType | undefined): Adaptation[];
    /**
     * Returns true if the give time is in the time boundaries of this `Period`.
     * @param {number} time
     * @param {object|null} nextPeriod - Period coming chronologically just
     * after in the same Manifest. `null` if this instance is the last `Period`.
     * @returns {boolean}
     */
    containsTime(time: number, nextPeriod: Period | null): boolean;
    /**
     * Format the current `Period`'s properties into a
     * `IPeriodMetadata` format which can better be communicated through
     * another thread.
     *
     * Please bear in mind however that the returned object will not be updated
     * when the current `Period` instance is updated, it is only a
     * snapshot at the current time.
     *
     * If you want to keep that data up-to-date with the current `Period`
     * instance, you will have to do it yourself.
     *
     * @returns {Object}
     */
    getMetadataSnapshot(): IPeriodMetadata;
}
//# sourceMappingURL=period.d.ts.map