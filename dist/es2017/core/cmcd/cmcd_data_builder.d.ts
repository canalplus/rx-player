import type { IAdaptation, IManifest, IPeriod, IRepresentation, ISegment } from "../../manifest";
import type { IReadOnlyPlaybackObserver, IRebufferingStatus, ObservationPosition } from "../../playback_observer";
import type { ICmcdOptions, ICmcdPayload, ITrackType } from "../../public_types";
import type { IRange } from "../../utils/ranges";
/**
 * Information that should be provided to the `CmcdDataBuilder` when getting the
 * CMCD payload for a segment.
 */
export interface ICmcdSegmentInfo {
    /** Manifest metadata linked to the wanted segment. */
    manifest: IManifest;
    /** Period metadata linked to the wanted segment. */
    period: IPeriod;
    /** Adaptation metadata linked to the wanted segment. */
    adaptation: IAdaptation;
    /** Representation metadata linked to the wanted segment. */
    representation: IRepresentation;
    /** Segment metadata linked to the wanted segment. */
    segment: ISegment;
}
/**
 * Media playback observation's properties the `CmcdDataBuilder` wants to have
 * access to.
 */
export interface ICmcdDataBuilderPlaybackObservation {
    /**
     * Ranges of buffered data per type of media.
     * `null` if no buffer exists for that type of media.
     */
    buffered: Record<ITrackType, IRange[] | null>;
    /**
     * Information on the current media position in seconds at the time of the
     * Observation.
     */
    position: ObservationPosition;
    /** Target playback rate at which we want to play the content. */
    speed: number;
    /**
     * Describes when the player is "rebuffering" and what event started that
     * status.
     * "Rebuffering" is a status where the player has not enough buffer ahead to
     * play reliably.
     * The RxPlayer should pause playback when a playback observation indicates the
     * rebuffering status.
     */
    rebuffering: IRebufferingStatus | null;
}
/**
 * Class allowing to easily obtain "Common Media Client Data" (CMCD) properties
 * that may be relied on while performing HTTP(S) requests on a CDN.
 *
 * @class CmcdDataBuilder
 */
export default class CmcdDataBuilder {
    private _sessionId;
    private _contentId;
    private _typePreference;
    private _lastThroughput;
    private _playbackObserver;
    private _bufferStarvationToggle;
    private _canceller;
    /**
     * Create a new `CmcdDataBuilder`, linked to the given options (see type
     * definition).
     * @param {Object} options
     */
    constructor(options: ICmcdOptions);
    /**
     * Start listening to the given `playbackObserver` so the `CmcdDataBuilder`
     * can extract some playback-linked metadata that it needs.
     *
     * It will keep listening for media data until `stopMonitoringPlayback` is called.
     *
     * If `startMonitoringPlayback` is called again, the previous monitoring is
     * also cancelled.
     * @param {Object} playbackObserver
     */
    startMonitoringPlayback(playbackObserver: IReadOnlyPlaybackObserver<ICmcdDataBuilderPlaybackObservation>): void;
    /**
     * Stop the monitoring of playback conditions started from the last
     * `stopMonitoringPlayback` call.
     */
    stopMonitoringPlayback(): void;
    /**
     * Update the last measured throughput for a specific media type.
     * Needed for some of CMCD's properties.
     * @param {string} trackType
     * @param {number|undefined} throughput - Last throughput measured for that
     * media type. `undefined` if unknown.
     */
    updateThroughput(trackType: ITrackType, throughput: number | undefined): void;
    /**
     * Returns the base of data that is common to all resources' requests.
     * @param {number|undefined} lastThroughput - The last measured throughput to
     * provide. `undefined` to provide no throughput.
     * @returns {Object}
     */
    private _getCommonCmcdData;
    /**
     * For the given type of Manifest, returns the corresponding CMCD payload
     * that should be provided alongside its request.
     * @param {string} transportType
     * @returns {Object}
     */
    getCmcdDataForManifest(transportType: string): ICmcdPayload;
    /**
     * For the given segment information, returns the corresponding CMCD payload
     * that should be provided alongside its request.
     * @param {Object} content
     * @returns {Object}
     */
    getCmcdDataForSegmentRequest(content: ICmcdSegmentInfo): ICmcdPayload;
    /**
     * From the given CMCD properties, produce the corresponding payload according
     * to current settings.
     * @param {Object} props
     * @returns {Object}
     */
    private _producePayload;
}
//# sourceMappingURL=cmcd_data_builder.d.ts.map