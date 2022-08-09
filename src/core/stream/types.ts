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

import { Subject } from "rxjs";
import Manifest, {
  Adaptation,
  ISegment,
  Period,
  Representation,
} from "../../manifest";
import { IEMSG } from "../../parsers/containers/isobmff";
import {
  IAudioTrackSwitchingMode,
  IVideoTrackSwitchingMode,
  IPlayerError,
  IVideoRepresentationsSwitchingMode,
  IAudioRepresentationsSwitchingMode,
} from "../../public_types";
import { IReadOnlySharedReference } from "../../utils/reference";
import { IContentProtection } from "../decrypt";
import { IBufferType } from "../segment_buffers";

/** Information about a Segment waiting to be loaded by the Stream. */
export interface IQueuedSegment {
  /** Priority of the segment request (lower number = higher priority). */
  priority : number;
  /** Segment wanted. */
  segment : ISegment;
}

/** Describe an encountered hole in the buffer, called a "discontinuity". */
export interface IBufferDiscontinuity {
  /**
   * Start time, in seconds, at which the discontinuity starts.
   *
   * if set to `undefined`, its true start time is unknown but the current
   * position is part of it.  It is thus a discontinuity that is currently
   * encountered.
   */
  start : number | undefined;
  /**
   * End time, in seconds at which the discontinuity ends (and thus where
   * new segments are encountered).
   *
   * If `null`, no new media segment is available for that Period and
   * buffer type until the end of the Period.
   */
  end : number | null;
}

/**
 * Event sent by a `RepresentationStream` to announce the current status
 * regarding the buffer for its associated Period and type (e.g. "audio",
 * "video", "text" etc.).
 *
 * Each new `IStreamStatusEvent` event replace the precedent one for the
 * same Period and type.
 */
export interface IStreamStatusEvent {
  type : "stream-status";
  value : {
    /** Period concerned. */
    period : Period;
    /** Buffer type concerned. */
    bufferType : IBufferType;
    /**
     * Present or future "hole" in the SegmentBuffer's buffer that will not be
     * filled by a segment, despite being part of the time period indicated by
     * the associated Period.
     *
     * This value is set to the most imminent of such "discontinuity", which
     * can be either:
     *
     *   - current (no segment available at `position` but future segments are
     *     available), in which case this discontinuity's true beginning might
     *     be unknown.
     *
     *   - a future hole between two segments in that Period.
     *
     *   - missing media data at the end of the time period associated to that
     *     Period.
     *
     * The presence or absence of a discontinuity can evolve during playback
     * (because new tracks or qualities might not have the same ones).
     * As such, it is advised to only consider the last discontinuity sent
     * through a `IStreamStatusEvent` event.
     */
    imminentDiscontinuity : IBufferDiscontinuity | null;
    /**
     * If `true`, no segment are left to be loaded to be able to play until the
     * end of the Period.
     */
    hasFinishedLoading : boolean;
    /**
     * Segments that will be scheduled for download to fill the buffer until
     * the buffer goal (first element of that list might already be ).
     */
    neededSegments : IQueuedSegment[];
    /** Position in the content in seconds from which this status was done.  */
    position : number;
  };
}

/** Event sent when a minor error happened, which doesn't stop playback. */
export interface IStreamWarningEvent {
  type : "warning";
  /** The error corresponding to the warning given. */
  value : IPlayerError;
}

/** Emitted after a new segment has been succesfully added to the SegmentBuffer */
export interface IStreamEventAddedSegment<T> {
  type : "added-segment";
  value : {
    /** Context about the content that has been added. */
    content: { period : Period;
               adaptation : Adaptation;
               representation : Representation; };
    /** The concerned Segment. */
    segment : ISegment;
    /** TimeRanges of the concerned SegmentBuffer after the segment was pushed. */
    buffered : TimeRanges;
    /* The data pushed */
    segmentData : T;
  };
}

/**
 * The Manifest needs to be refreshed.
 * Note that a `RepresentationStream` might still be active even after sending
 * this event:
 * It might download and push segments, send any other event etc.
 */
export interface IStreamNeedsManifestRefresh {
  type : "needs-manifest-refresh";
  value: undefined;
}

/**
 * The Manifest is possibly out-of-sync and needs to be refreshed completely.
 *
 * The Stream made that guess because a segment that should have been available
 * is not and because it suspects this is due to a synchronization problem.
 */
export interface IStreamManifestMightBeOutOfSync {
  type : "manifest-might-be-out-of-sync";
  value : undefined;
}

/** Emitted when a segment with protection information has been encountered. */
export interface IEncryptionDataEncounteredEvent {
  type : "encryption-data-encountered";
  value : IContentProtection;
}

/** Structure describing an "inband" event, as found in a media segment. */
export interface IInbandEvent {
  /** Type when the event was foud inside a "emsg` ISOBMFF box */
  type: "emsg";
  /** Value when the event was foud inside a "emsg` ISOBMFF box */
  value: IEMSG;
}

/**
 * "Inband" (inside the media or initialization segment) event(s) have been
 * encountered.
 */
export interface IInbandEventsEvent {
  type : "inband-events";
  value : IInbandEvent[];
}

/**
 * Event sent when a `RepresentationStream` is terminating:
 *
 *   - it has finished all its segment requests and won't do new ones.
 *
 *   - it has stopped regularly checking for its current status.
 *
 *   - it only waits until all the segments it has loaded have been pushed to the
 *     SegmentBuffer before actually completing.
 *
 * You can use this event as a hint that a new `RepresentationStream` can be
 * created.
 */
export interface IStreamTerminatingEvent {
  type : "stream-terminating";
  value : undefined;
}

/** Emitted as new bitrate estimates are done. */
export interface IBitrateEstimationChangeEvent {
  type : "bitrateEstimationChange";
  value : {
    /** The type of buffer for which the estimation is done. */
    type : IBufferType;
    /**
     * The bitrate estimate, in bits per seconds. `undefined` when no bitrate
     * estimate is currently available.
     */
    bitrate : number|undefined;
  };
}

/**
 * Emitted when a new `RepresentationStream` is created to load segments from a
 * `Representation`.
 */
export interface IRepresentationChangeEvent {
  type : "representationChange";
  value : {
    /** The type of buffer linked to that `RepresentationStream`. */
    type : IBufferType;
    /** The `Period` linked to the `RepresentationStream` we're creating. */
    period : Period;
    /**
     * The `Representation` linked to the `RepresentationStream` we're creating.
     * `null` when we're choosing no Representation at all.
     */
    representation : Representation |
                     null; };
}

/**
 * Emitted when a new `AdaptationStream` is created to load segments from an
 * `Adaptation`.
 */
export interface IAdaptationChangeEvent {
  type : "adaptationChange";
  value : {
    /** The type of buffer for which the Representation is changing. */
    type : IBufferType;
    /** The `Period` linked to the `RepresentationStream` we're creating. */
    period : Period;
    /**
     * The `Adaptation` linked to the `AdaptationStream` we're creating.
     * `null` when we're choosing no Adaptation at all.
     */
    adaptation : Adaptation |
                 null;
  };
}

/** Emitted when a new `Period` is currently playing. */
export interface IActivePeriodChangedEvent {
  type: "activePeriodChanged";
  value : {
    /** The Period we're now playing. */
    period: Period;
  };
}

/**
 * A new `PeriodStream` is ready to start but needs an Adaptation (i.e. track)
 * to be chosen first.
 */
export interface IPeriodStreamReadyEvent {
  type : "periodStreamReady";
  value : {
    /** The type of buffer linked to the `PeriodStream` we want to create. */
    type : IBufferType;
    /** The `Manifest` linked to the `PeriodStream` we have created. */
    manifest : Manifest;
    /** The `Period` linked to the `PeriodStream` we have created. */
    period : Period;
    /**
     * The subject through which any Adaptation (i.e. track) choice should be
     * emitted for that `PeriodStream`.
     *
     * The `PeriodStream` will not do anything until this subject has emitted
     * at least one to give its initial choice.
     * You can send `null` through it to tell this `PeriodStream` that you don't
     * want any `Adaptation` for now.
     */
    adaptation$ : Subject<IAdaptationChoice | null>;
  };
}

/** Object indicating a choice of Adaptation made by the user. */
export interface IAdaptationChoice {
  /** The Adaptation choosen. */
  adaptation : Adaptation;

  /** "Switching mode" in which the track switch should happen. */
  switchingMode : ITrackSwitchingMode;

  /**
   * Shared reference allowing to indicate which Representations from
   * that Adaptation are allowed.
   */
  representations : IReadOnlySharedReference<IRepresentationsChoice>;
}

/** Object indicating a choice of allowed Representations made by the user. */
export interface IRepresentationsChoice {
  /** `Representation`s wanted by the user. */
  representations : Representation[];
  /**
   * How the Streams should react if another, not currently authorized,
   * Representation was previously playing.
   */
  switchingMode : IVideoRepresentationsSwitchingMode |
                  IAudioRepresentationsSwitchingMode;
}

export type ITrackSwitchingMode = IAudioTrackSwitchingMode |
                                  IVideoTrackSwitchingMode;

/**
 * A `PeriodStream` has been removed.
 * This event can be used for clean-up purposes. For example, you are free to
 * remove from scope the subject that you used to choose a track for that
 * `PeriodStream`.
 */
export interface IPeriodStreamClearedEvent {
  type : "periodStreamCleared";
  value : {
    /**
     * The type of buffer linked to the `PeriodStream` we just removed.
     *
     * The combination of this and `Period` should give you enough information
     * about which `PeriodStream` has been removed.
     */
    type : IBufferType;
    manifest : Manifest;
    /**
     * The `Period` linked to the `PeriodStream` we just removed.
     *
     * The combination of this and `Period` should give you enough information
     * about which `PeriodStream` has been removed.
     */
    period : Period;
  };
}

/**
 * The last (chronologically) PeriodStreams from every type of buffers are full.
 * This means usually that segments for the whole content have been pushed to
 * the end.
 */
export interface IEndOfStreamEvent { type: "end-of-stream";
                                     value: undefined; }

/**
 * At least a single PeriodStream is now pushing segments.
 * This event is sent to cancel a previous `IEndOfStreamEvent`.
 *
 * Note that it also can be send if no `IEndOfStreamEvent` has been sent before.
 */
export interface IResumeStreamEvent { type: "resume-stream";
                                      value: undefined; }

/**
 * The last (chronologically) `PeriodStream` for a given type has pushed all
 * the segments it needs until the end.
 */
export interface ICompletedStreamEvent { type: "complete-stream";
                                         value : { type: IBufferType }; }

/**
 * A situation needs the MediaSource to be reloaded.
 *
 * Once the MediaSource is reloaded, the Streams need to be restarted from
 * scratch.
 */
export interface INeedsMediaSourceReload {
  type: "needs-media-source-reload";
  value: {
    /**
     * The position in seconds and the time at which the MediaSource should be
     * reset once it has been reloaded.
     */
    position : number;
    /**
     * If `true`, we want the HTMLMediaElement to play right after the reload is
     * done.
     * If `false`, we want to stay in a paused state at that point.
     */
    autoPlay : boolean;
  };
}

/**
 * A stream cannot go forward loading segments because it needs the
 * `MediaSource` to be reloaded first.
 *
 * This is a Stream internal event before being translated into either an
 * `INeedsMediaSourceReload` event or an `ILockedStreamEvent` depending on if
 * the reloading action has to be taken now or when the corresponding Period
 * becomes active.
 */
export interface IWaitingMediaSourceReloadInternalEvent {
  type: "waiting-media-source-reload";
  value: {
    /** Period concerned. */
    period : Period;
    /** Buffer type concerned. */
    bufferType : IBufferType;
    /**
     * The position in seconds and the time at which the MediaSource should be
     * reset once it has been reloaded.
     */
    position : number;
    /**
     * If `true`, we want the HTMLMediaElement to play right after the reload is
     * done.
     * If `false`, we want to stay in a paused state at that point.
     */
    autoPlay : boolean;
  };
}

/**
 * The stream is unable to load segments for a particular Period and buffer
 * type until that Period becomes the currently-played Period.
 *
 * This might be the case for example when a track change happened for an
 * upcoming Period, which necessitates the reloading of the media source -
 * through a `INeedsMediaSourceReload` event once the Period is the current one.
 * Here, the stream might stay in a locked mode for segments linked to that
 * Period and buffer type, meaning it will not load any such segment until that
 * next Period becomes the current one (in which case it will probably ask to
 * reload).
 *
 * This event can be useful when investigating rebuffering situation: one might
 * be due to the next Period not loading segment of a certain type because of a
 * locked stream. In that case, playing until or seeking at the start of the
 * corresponding Period should be enough to "unlock" the stream.
 */
export interface ILockedStreamEvent {
  type : "locked-stream";
  value : {
    /** Period concerned. */
    period : Period;
    /** Buffer type concerned. */
    bufferType : IBufferType;
  };
}

/**
 * Event emitted after the SegmentBuffer have been "cleaned" to remove from it
 * every non-decipherable segments - usually following an update of the
 * decipherability status of some `Representation`(s).
 *
 * When that event is emitted, the current HTMLMediaElement's buffer might need
 * to be "flushed" to continue (e.g. through a little seek operation).
 */
export interface INeedsDecipherabilityFlush {
  type: "needs-decipherability-flush";
  value: {
    /**
     * Indicated in the case where the MediaSource has to be reloaded,
     * in which case the time of the HTMLMediaElement should be reset to that
     * position, in seconds, once reloaded.
     */
    position : number;
    /**
     * If `true`, we want the HTMLMediaElement to play right after the flush is
     * done.
     * If `false`, we want to stay in a paused state at that point.
     */
    autoPlay : boolean;
    /**
     * The duration (maximum seekable position) of the content.
     * This is indicated in the case where a seek has to be performed, to avoid
     * seeking too far in the content.
     */
    duration : number;
  };
}

/**
 * Some situations might require the browser's buffers to be refreshed.
 * This event is emitted when such situation arised.
 */
export interface INeedsBufferFlushEvent {
  type: "needs-buffer-flush";
  value: undefined;
}

/** Event sent by a `RepresentationStream`. */
export type IRepresentationStreamEvent = IStreamStatusEvent |
                                         IStreamEventAddedSegment<unknown> |
                                         IEncryptionDataEncounteredEvent |
                                         IStreamManifestMightBeOutOfSync |
                                         IStreamTerminatingEvent |
                                         IStreamNeedsManifestRefresh |
                                         IStreamWarningEvent |
                                         IInbandEventsEvent;

/** Event sent by an `AdaptationStream`. */
export type IAdaptationStreamEvent = IBitrateEstimationChangeEvent |
                                     INeedsDecipherabilityFlush |
                                     IRepresentationChangeEvent |
                                     INeedsBufferFlushEvent |
                                     IWaitingMediaSourceReloadInternalEvent |

                                     // From a RepresentationStream

                                     IStreamStatusEvent |
                                     IEncryptionDataEncounteredEvent |
                                     IStreamManifestMightBeOutOfSync |
                                     IStreamNeedsManifestRefresh |
                                     IStreamWarningEvent |
                                     IInbandEventsEvent;

/** Event sent by a `PeriodStream`. */
export type IPeriodStreamEvent = IPeriodStreamReadyEvent |
                                 IAdaptationChangeEvent |
                                 IWaitingMediaSourceReloadInternalEvent |

                                 // From an AdaptationStream

                                 IBitrateEstimationChangeEvent |
                                 INeedsMediaSourceReload |
                                 INeedsBufferFlushEvent |
                                 INeedsDecipherabilityFlush |
                                 IRepresentationChangeEvent |

                                 // From a RepresentationStream

                                 IStreamStatusEvent |
                                 IEncryptionDataEncounteredEvent |
                                 IStreamManifestMightBeOutOfSync |
                                 IStreamNeedsManifestRefresh |
                                 IStreamWarningEvent |
                                 IInbandEventsEvent;

/** Event coming from function(s) managing multiple PeriodStreams. */
export type IMultiplePeriodStreamsEvent = IPeriodStreamClearedEvent |
                                          ICompletedStreamEvent |

                                          // From a PeriodStream

                                          IPeriodStreamReadyEvent |
                                          INeedsBufferFlushEvent |
                                          IAdaptationChangeEvent |
                                          IWaitingMediaSourceReloadInternalEvent |

                                          // From an AdaptationStream

                                          IBitrateEstimationChangeEvent |
                                          INeedsMediaSourceReload |
                                          INeedsDecipherabilityFlush |
                                          IRepresentationChangeEvent |

                                          // From a RepresentationStream

                                          IStreamStatusEvent |
                                          IEncryptionDataEncounteredEvent |
                                          IStreamManifestMightBeOutOfSync |
                                          IStreamNeedsManifestRefresh |
                                          IStreamWarningEvent |
                                          IInbandEventsEvent;

/** Every event sent by the `StreamOrchestrator`. */
export type IStreamOrchestratorEvent = IActivePeriodChangedEvent |
                                       IEndOfStreamEvent |
                                       IResumeStreamEvent |

                                       IPeriodStreamClearedEvent |
                                       ICompletedStreamEvent |

                                       // From a PeriodStream

                                       IPeriodStreamReadyEvent |
                                       IAdaptationChangeEvent |
                                       ILockedStreamEvent |

                                       // From an AdaptationStream

                                       IBitrateEstimationChangeEvent |
                                       INeedsMediaSourceReload |
                                       INeedsBufferFlushEvent |
                                       INeedsDecipherabilityFlush |
                                       IRepresentationChangeEvent |

                                       // From a RepresentationStream

                                       IStreamStatusEvent |
                                       IEncryptionDataEncounteredEvent |
                                       IStreamManifestMightBeOutOfSync |
                                       IStreamNeedsManifestRefresh |
                                       IStreamWarningEvent |
                                       IInbandEventsEvent;
