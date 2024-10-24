import { config } from "../../../experimental";
import log from "../../../log";
import type { IAdaptation, IPeriod, IRepresentation } from "../../../manifest";
import type {
  IFreezingStatus,
  IRebufferingStatus,
  ObservationPosition,
} from "../../../playback_observer";
import getMonotonicTimeStamp from "../../../utils/monotonic_timestamp";
import type SegmentSinksStore from "../../segment_sinks";
import type { IBufferedChunk } from "../../segment_sinks";

/**
 * Set when there is a freeze which seems to be specifically linked to a,
 * or multiple, content's `Representation` despite no attribute of it
 * indicating so (i.e. it is decodable and decipherable).
 * In that case, the recommendation is to avoid playing those
 * `Representation` at all.
 */
export interface IRepresentationDeprecationFreezeResolution {
  type: "deprecate-representations";
  /** The `Representation` to avoid. */
  value: Array<{
    adaptation: IAdaptation;
    period: IPeriod;
    representation: IRepresentation;
  }>;
}

/**
 * Set when there is a freeze which seem to be fixable by just
 * "flushing" the buffer, e.g. generally by just seeking to another,
 * close, position.
 */
export interface IFlushFreezeResolution {
  type: "flush";
  value: {
    /**
     * The relative position, when compared to the current playback
     * position, we should be playing at after the flush.
     */
    relativeSeek: number;
  };
}

/**
 * Set when there is a freeze which seem to be fixable by "reloading"
 * the content: meaning re-creating a `MediaSource` and its associated
 * buffers.
 *
 * This can for example be when the RxPlayer is playing undecipherable
 * or undecodable Representation (e.g. because of some race condition),
 * or when an unexplainable freeze might not be fixed by just a flush.
 */
export interface IReloadFreezeResolution {
  type: "reload";
  value: null;
}

/** Describe a strategy that can be taken to un-freeze playback. */
export type IFreezeResolution =
  | IRepresentationDeprecationFreezeResolution
  | IFlushFreezeResolution
  | IReloadFreezeResolution;

/**
 * Sometimes playback is stuck for no known reason, despite having data in
 * buffers.
 *
 * This can be due to relatively valid cause: performance being slow on the
 * device making the content slow to start up, decryption keys not being
 * obtained / usable yet etc.
 *
 * Yet in many cases, this is abnormal and may lead to being stuck at the same
 * position and video frame indefinitely.
 *
 * For those situations, we have a series of tricks and heuristic, which are
 * implemented by the `FreezeResolver`.
 *
 * @class FreezeResolver
 */
export default class FreezeResolver {
  /** Contain information about segments contained in media buffers. */
  private _segmentSinksStore: SegmentSinksStore;

  /** Contains a short-term history of what content has been played recently. */
  private _lastSegmentInfo: {
    /** Playback history for the video data. */
    video: IPlayedHistoryEntry[];
    /** Playback history for the audio data. */
    audio: IPlayedHistoryEntry[];
  };

  /**
   * Monotonically-raising timestamp before which we will just ignore freezing
   * situations.
   *
   * To avoid flushing/reloading in a loop, we ignore for some time playback
   * measure before retrying to unstuck playback.
   */
  private _ignoreFreezeUntil: number | null;

  /**
   * Information on the last attempt to un-freeze playback by "flushing" buffers.
   *
   * `null` if we never attempted to flush buffers.
   */
  private _lastFlushAttempt: {
    /** Monotonically-raising timestamp at the time when we attempted the flush. */
    timestamp: number;
    /** Playback position at which the flush was performed, in seconds. */
    position: number;
  } | null;

  /**
   * If set to something else than `null`, this is the timestamp at the time the
   * `FreezeResolver` started to consider its decipherability-linked un-freezing
   * logic.
   *
   * This is used as a time of reference: after enough time was spent from that
   * timestamp, the `FreezeResolver` will attempt supplementary unfreezing
   * strategies.
   *
   * When the `FreezeResolver` is not considering those decipherability-related
   * strategies for now, it is set to `null`.
   */
  private _decipherabilityFreezeStartingTimestamp: number | null;

  constructor(segmentSinksStore: SegmentSinksStore) {
    this._segmentSinksStore = segmentSinksStore;
    this._decipherabilityFreezeStartingTimestamp = null;
    this._ignoreFreezeUntil = null;
    this._lastFlushAttempt = null;
    this._lastSegmentInfo = {
      audio: [],
      video: [],
    };
  }

  /**
   * Check that playback is not freezing, and if it is, return a solution that
   * should be atempted to unfreeze it.
   *
   * Returns `null` either when there's no freeze is happening or if there's one
   * but there's nothing we should do about it yet.
   *
   * Refer to the returned type's definition for more information.
   *
   * @param {Object} observation - The last playback observation produced, it
   * has to be recent (just triggered for example).
   * @returns {Object|null}
   */
  public onNewObservation(
    observation: IFreezeResolverObservation,
  ): IFreezeResolution | null {
    const now = getMonotonicTimeStamp();
    this._addPositionToHistory(observation, now);

    if (this._ignoreFreezeUntil !== null && now < this._ignoreFreezeUntil) {
      return null;
    }
    this._ignoreFreezeUntil = null;

    const {
      UNFREEZING_SEEK_DELAY,
      UNFREEZING_DELTA_POSITION,
      FREEZING_FLUSH_FAILURE_DELAY,
    } = config.getCurrent();
    const { readyState, rebuffering, freezing, fullyLoaded } = observation;

    const freezingPosition = observation.position.getPolled();
    const bufferGap = normalizeBufferGap(observation.bufferGap);

    /** If set to `true`, we consider playback "frozen" */
    const isFrozen =
      freezing !== null ||
      // When rebuffering, `freezing` might be not set as we're actively pausing
      // playback. Yet, rebuffering occurences can also be abnormal, such as
      // when enough buffer is constructed but with a low readyState (those are
      // generally decryption issues).
      (rebuffering !== null && readyState === 1 && (bufferGap >= 6 || fullyLoaded));

    if (!isFrozen) {
      this._decipherabilityFreezeStartingTimestamp = null;
      return null;
    }

    const freezingTs = freezing?.timestamp ?? rebuffering?.timestamp ?? null;
    log.info("FR: Freeze detected", freezingTs, now - (freezingTs ?? now));

    /**
     * If `true`, we recently tried to "flush" to unstuck playback but playback
     * is still stuck
     */
    const recentFlushAttemptFailed =
      this._lastFlushAttempt !== null &&
      now - this._lastFlushAttempt.timestamp < FREEZING_FLUSH_FAILURE_DELAY.MAXIMUM &&
      now - this._lastFlushAttempt.timestamp >= FREEZING_FLUSH_FAILURE_DELAY.MINIMUM &&
      Math.abs(freezingPosition - this._lastFlushAttempt.position) <
        FREEZING_FLUSH_FAILURE_DELAY.POSITION_DELTA;

    if (recentFlushAttemptFailed) {
      const secondUnfreezeStrat = this._getStrategyIfFlushingFails(freezingPosition);
      this._decipherabilityFreezeStartingTimestamp = null;
      this._ignoreFreezeUntil = now + 6000;
      return secondUnfreezeStrat;
    }

    const decipherabilityFreezeStrat = this._checkForDecipherabilityRelatedFreeze(
      observation,
      now,
    );
    if (decipherabilityFreezeStrat !== null) {
      return decipherabilityFreezeStrat;
    }

    if (freezingTs !== null && now - freezingTs > UNFREEZING_SEEK_DELAY) {
      this._lastFlushAttempt = {
        timestamp: now,
        position: freezingPosition + UNFREEZING_DELTA_POSITION,
      };
      log.debug("FR: trying to flush to un-freeze");

      this._decipherabilityFreezeStartingTimestamp = null;
      this._ignoreFreezeUntil = now + 6000;
      return {
        type: "flush",
        value: { relativeSeek: UNFREEZING_DELTA_POSITION },
      };
    }
    return null;
  }

  /**
   * Performs decipherability-related checks if it makes sense.
   *
   * If decipherability-related checks have been performed **AND** an
   * un-freezing strategy has been selected by this method, then return
   * an object describing this wanted unfreezing strategy.
   *
   * If this method decides to take no action for now, it returns `null`.
   * @param {Object} observation - playback observation that has just been
   * performed.
   * @param {number} now - Monotonically-raising timestamp for the current
   * time.
   * @returns {Object|null}
   */
  private _checkForDecipherabilityRelatedFreeze(
    observation: IFreezeResolverObservation,
    now: number,
  ): IFreezeResolution | null {
    const { readyState, rebuffering, freezing, fullyLoaded } = observation;
    const bufferGap = normalizeBufferGap(observation.bufferGap);
    const rebufferingForTooLong =
      rebuffering !== null && now - rebuffering.timestamp > 4000;
    const frozenForTooLong = freezing !== null && now - freezing.timestamp > 4000;

    const hasDecipherabilityFreezePotential =
      (rebufferingForTooLong || frozenForTooLong) &&
      ((bufferGap < 6 && !fullyLoaded) || readyState > 1);

    if (!hasDecipherabilityFreezePotential) {
      this._decipherabilityFreezeStartingTimestamp = null;
    } else if (this._decipherabilityFreezeStartingTimestamp === null) {
      log.debug("FR: Start of a potential decipherability freeze detected");
      this._decipherabilityFreezeStartingTimestamp = now;
    }

    const shouldHandleDecipherabilityFreeze =
      this._decipherabilityFreezeStartingTimestamp !== null &&
      getMonotonicTimeStamp() - this._decipherabilityFreezeStartingTimestamp > 4000;

    let hasOnlyDecipherableSegments = true;
    let isClear = true;
    for (const ttype of ["audio", "video"] as const) {
      const status = this._segmentSinksStore.getStatus(ttype);
      if (status.type === "initialized") {
        for (const segment of status.value.getLastKnownInventory()) {
          const { representation } = segment.infos;
          if (representation.decipherable === false) {
            log.warn("FR: we have undecipherable segments left in the buffer, reloading");
            this._decipherabilityFreezeStartingTimestamp = null;
            this._ignoreFreezeUntil = now + 6000;
            return { type: "reload", value: null };
          } else if (representation.contentProtections !== undefined) {
            isClear = false;
            if (representation.decipherable !== true) {
              hasOnlyDecipherableSegments = false;
            }
          }
        }
      }
    }

    if (shouldHandleDecipherabilityFreeze && !isClear && hasOnlyDecipherableSegments) {
      log.warn(
        "FR: we are frozen despite only having decipherable " +
          "segments left in the buffer, reloading",
      );
      this._decipherabilityFreezeStartingTimestamp = null;
      this._ignoreFreezeUntil = now + 6000;
      return { type: "reload", value: null };
    }
    return null;
  }

  /**
   * This method should only be called if a "flush" strategy has recently be
   * taken to try to unfreeze playback yet playback is still frozen.
   *
   * It considers the current played content and returns a more-involved
   * unfreezing strategy (most often reload-related) to try to unfree playback.
   * @param {number} freezingPosition - The playback position at which we're
   * currently frozen.
   * @returns {Object}
   */
  private _getStrategyIfFlushingFails(freezingPosition: number): IFreezeResolution {
    log.warn(
      "FR: A recent flush seemed to have no effect on freeze, checking for transitions",
    );

    /** Contains Representation we might want to deprecate after the following algorithm */
    const toDeprecate = [];

    for (const ttype of ["audio", "video"] as const) {
      const segmentList = this._lastSegmentInfo[ttype];
      if (segmentList.length === 0) {
        // There's no buffered segment for that type, go to next type
        continue;
      }

      /** Played history information on the current segment we're stuck on. */
      let currentSegmentEntry = segmentList[segmentList.length - 1];
      if (currentSegmentEntry.segment === null) {
        // No segment currently played for that given type, go to next type
        continue;
      }

      /** Metadata on the segment currently being played. */
      const currentSegment = currentSegmentEntry.segment;

      /**
       * Set to the first previous segment which is linked to a different
       * Representation.
       */
      let previousRepresentationEntry: IPlayedHistoryEntry | undefined;

      // Now find `previousRepresentationEntry` and `currentSegmentEntry`.
      for (let i = segmentList.length - 2; i >= 0; i--) {
        const segment = segmentList[i];
        if (segment.segment === null) {
          // Before the current segment, there was no segment being played
          previousRepresentationEntry = segment;
          break;
        } else if (
          segment.segment.infos.representation.uniqueId !==
            currentSegment.infos.representation.uniqueId &&
          currentSegmentEntry.timestamp - segment.timestamp < 5000
        ) {
          // Before the current segment, there was a segment of a different
          // Representation being played
          previousRepresentationEntry = segment;
          break;
        } else if (
          currentSegment !== null &&
          segment.segment.start === currentSegment.start &&
          // Ignore history entry concerning the same segment more than 3
          // seconds of playback behind - we don't want to compare things
          // that happended too long ago.
          freezingPosition - segment.position < 3000
        ) {
          // We're still playing the last segment at that point, update it.
          //
          // (We may be playing, or be freezing, on the current segment for some
          // time, this allows to consider a more precize timestamp at which we
          // switched segments).
          currentSegmentEntry = segment;
        }
      }

      if (
        previousRepresentationEntry === undefined ||
        previousRepresentationEntry.segment === null
      ) {
        log.debug(
          "FR: Freeze when beginning to play a content, try deprecating this quality",
        );
        toDeprecate.push({
          adaptation: currentSegment.infos.adaptation,
          period: currentSegment.infos.period,
          representation: currentSegment.infos.representation,
        });
      } else if (
        currentSegment.infos.period.id !==
        previousRepresentationEntry.segment.infos.period.id
      ) {
        log.debug("FR: Freeze when switching Period, reloading");
        return { type: "reload", value: null };
      } else if (
        currentSegment.infos.representation.uniqueId !==
        previousRepresentationEntry.segment.infos.representation.uniqueId
      ) {
        log.warn(
          "FR: Freeze when switching Representation, deprecating",
          currentSegment.infos.representation.bitrate,
        );
        toDeprecate.push({
          adaptation: currentSegment.infos.adaptation,
          period: currentSegment.infos.period,
          representation: currentSegment.infos.representation,
        });
      }
    }

    if (toDeprecate.length > 0) {
      return { type: "deprecate-representations", value: toDeprecate };
    } else {
      log.debug("FR: Reloading because flush doesn't work");
      return { type: "reload", value: null };
    }
  }

  /**
   * Add entry to `this._lastSegmentInfo` for the position that is currently
   * played according to the given `observation`.
   *
   * @param {Object} observation
   * @param {number} currentTimestamp
   */
  private _addPositionToHistory(
    observation: IFreezeResolverObservation,
    currentTimestamp: number,
  ): void {
    const position = observation.position.getPolled();
    for (const ttype of ["audio", "video"] as const) {
      const status = this._segmentSinksStore.getStatus(ttype);
      if (status.type === "initialized") {
        for (const segment of status.value.getLastKnownInventory()) {
          if (
            (segment.bufferedStart ?? segment.start) <= position &&
            (segment.bufferedEnd ?? segment.end) > position
          ) {
            this._lastSegmentInfo[ttype].push({
              segment,
              position,
              timestamp: currentTimestamp,
            });
          }
        }
      } else {
        this._lastSegmentInfo[ttype].push({
          segment: null,
          position,
          timestamp: currentTimestamp,
        });
      }
      if (this._lastSegmentInfo[ttype].length > 100) {
        const toRemove = this._lastSegmentInfo[ttype].length - 100;
        this._lastSegmentInfo[ttype].splice(0, toRemove);
      }

      const removalTs = currentTimestamp - 60000;
      let i;
      for (i = 0; i < this._lastSegmentInfo[ttype].length; i++) {
        if (this._lastSegmentInfo[ttype][i].timestamp > removalTs) {
          break;
        }
      }
      if (i > 0) {
        this._lastSegmentInfo[ttype].splice(0, i);
      }
    }
  }
}

/**
 * Constructs a `bufferGap` value that is more usable than what the
 * `PlaybackObserver` returns:
 *   - it cannot be `undefined`
 *   - its weird `Infinity` value is translated to the more explicit `0`.
 * @param {number|undefined} bufferGap
 * @returns {number}
 */
function normalizeBufferGap(bufferGap: number | undefined): number {
  return bufferGap !== undefined && isFinite(bufferGap) ? bufferGap : 0;
}

/** Entry for the playback history maintained by the `FreezeResolver`. */
interface IPlayedHistoryEntry {
  /**
   * Segment and related information that seemed to be played at the
   * associated timestamp and playback position.
   *
   * Note that this is only a guess and not a certainty.
   */
  segment: null | IBufferedChunk;
  /**
   * Playback position, in seconds, as seen on the `HTMLMediaElement`, at which
   * we were playing.
   */
  position: number;
  /** Monotonically-raising timestamp for that entry. */
  timestamp: number;
}

/** Playback observation needed by the `FreezeResolver`. */
export interface IFreezeResolverObservation {
  /** Current `readyState` value on the media element. */
  readyState: number;
  /**
   * Set if the player is short on audio and/or video media data and is a such,
   * rebuffering.
   * `null` if not.
   */
  rebuffering: IRebufferingStatus | null;
  /**
   * Set if the player is frozen, that is, stuck in place for unknown reason.
   * Note that this reason can be a valid one, such as a necessary license not
   * being obtained yet.
   *
   * `null` if the player is not frozen.
   */
  freezing: IFreezingStatus | null;
  /**
   * Gap between `currentTime` and the next position with un-buffered data.
   * `Infinity` if we don't have buffered data right now.
   * `undefined` if we cannot determine the buffer gap.
   */
  bufferGap: number | undefined;
  position: ObservationPosition;
  /** If `true` the content is loaded until its maximum position. */
  fullyLoaded: boolean;
}
