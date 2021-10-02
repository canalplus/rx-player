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

import Manifest, {
  Adaptation,
  ISegment,
  Period,
  Representation,
} from "../../manifest";
import { IPlayerError } from "../../public_types";
import EventEmitter from "../../utils/event_emitter";
import { ISharedReference } from "../../utils/reference";
import { PlaybackObserver } from "../api";
import SegmentBuffersStore, {
  IBufferType,
} from "../segment_buffers";
import {
  IAdaptationChoice,
  IInbandEvent,
} from "../stream";
import {
  IPublicNonFiniteStreamEvent,
  IPublicStreamEvent,
} from "./utils/stream_events_emitter";

/**
 * Class allowing to start playing a content on an `HTMLMediaElement`.
 *
 * The actual constructor arguments depend on the `ContentInitializer` defined,
 * but should reflect all potential configuration wanted relative to this
 * content's playback.
 *
 * Various events may be emitted by a `ContentInitializer`. However, no event
 * should be emitted before `prepare` or `start` is called and no event should
 * be emitted after `dispose` is called.
 */
export abstract class ContentInitializer extends EventEmitter<IContentInitializerEvents> {
  /**
   * Prepare the content linked to this `ContentInitializer` in the background,
   * without actually trying to play it.
   *
   * This method may be used for optimization reasons, for example to prepare a
   * future content without interrupting the previous one playing on a given
   * `HTMLMediaElement`.
   */
  public abstract prepare() : void;

  /**
   * Actually starts playing the content linked to this `ContentInitializer` on
   * the given `mediaElement`.
   *
   * Only a single call to `start` is expected to be performed on each
   * `ContentInitializer`.
   *
   * A call to `prepare` may or may not have been performed before calling
   * `start`. If it was, it may or may not have yet finished the preparation
   * phase before `start` is called (the `ContentInitializer` should stay
   * resilient in both scenarios).
   *
   * @param {HTMLMediaElement} mediaElement - `HTMLMediaElement` on which the
   * content will play. This is given to `start` (and not sooner) to ensure
   * that no prior step influence the `HTMLMediaElement`, on which a previous
   * content could have been playing until then.
   *
   * If a content was already playing on that `HTMLMediaElement`, it will be
   * stopped.
   * @param {Object} playbackObserver - Interface allowing to poll playback
   * information on what's playing on the `HTMLMediaElement` at regular
   * intervals.
   */
  public abstract start(
    mediaElement : HTMLMediaElement,
    playbackObserver : PlaybackObserver
  ) : void;

  /**
   * Update URL of the content currently being played (e.g. DASH's MPD).
   * @param {Array.<string>|undefined} urls - URLs to reach that content /
   * Manifest from the most prioritized URL to the least prioritized URL.
   * @param {boolean} refreshNow - If `true` the resource in question (e.g.
   * DASH's MPD) will be refreshed immediately.
   */
  public abstract updateContentUrls(
    urls : string[] | undefined,
    refreshNow : boolean
  ) : void;

  /**
   * Stop playing the content linked to this `ContentInitializer` on the
   * `HTMLMediaElement` linked to it and dispose of every resources taken while
   * trying to do so.
   */
  public abstract dispose() : void;
}

/** Every events emitted by a `ContentInitializer`. */
export interface IContentInitializerEvents {
  /** Event sent when a minor happened. */
  warning : IPlayerError;
  /** A fatal error occured, leading to the current content being stopped. */
  error : unknown;
  /** Event sent after the Manifest has been loaded and parsed for the first time. */
  manifestReady : Manifest;
  /** Event sent after the Manifest has been updated. */
  manifestUpdate: null;
  /**
   * Event sent when we're starting attach a new MediaSource to the media element
   * (after removing the previous one).
   */
  reloadingMediaSource: null;
  /** Event sent after the player stalled. */
  stalled : IStallingSituation;
  /** Event sent when the player goes out of a stalling situation. */
  unstalled : null;
  /**
   * Event sent just as the content is considered as "loaded".
   * From this point on, the user can reliably play/pause/resume the stream.
   */
  loaded : { segmentBuffersStore: SegmentBuffersStore | null };
  /**
   * Event sent after updating the decipherability status of at least one
   * Manifest's Representation.
   * This generally means that some Representation(s) were detected to be
   * undecipherable on the current device.
   */
  decipherabilityUpdate: Array<{ manifest : Manifest;
                                 period : Period;
                                 adaptation : Adaptation;
                                 representation : Representation; }>;
  /** Event emitted when a stream event is encountered. */
  streamEvent: IPublicStreamEvent |
               IPublicNonFiniteStreamEvent;
  streamEventSkip: IPublicStreamEvent |
                   IPublicNonFiniteStreamEvent;
  /** Emitted when a new `Period` is currently playing. */
  activePeriodChanged: {
    /** The Period we're now playing. */
    period: Period;
  };
  /**
   * A new `PeriodStream` is ready to start but needs an Adaptation (i.e. track)
   * to be chosen first.
   */
  periodStreamReady: {
    /** The type of buffer linked to the `PeriodStream` we want to create. */
    type : IBufferType;
    /** The `Manifest` linked to the `PeriodStream` we have created. */
    manifest : Manifest;
    /** The `Period` linked to the `PeriodStream` we have created. */
    period : Period;
    /**
     * The Reference through which any Adaptation (i.e. track) choice should be
     * emitted for that `PeriodStream`.
     *
     * The `PeriodStream` will not do anything until this Reference has emitted
     * at least one to give its initial choice.
     * You can send `null` through it to tell this `PeriodStream` that you don't
     * want any `Adaptation`.
     * It is set to `undefined` by default, you SHOULD NOT set it to `undefined`
     * yourself.
     */
    adaptationRef : ISharedReference<IAdaptationChoice|null|undefined>;
  };
  /**
   * A `PeriodStream` has been removed.
   * This event can be used for clean-up purposes. For example, you are free to
   * remove from scope the shared reference that you used to choose a track for
   * that `PeriodStream`.
   */
  periodStreamCleared: {
    /**
     * The type of buffer linked to the `PeriodStream` we just removed.
     *
     * The combination of this and `Period` should give you enough information
     * about which `PeriodStream` has been removed.
     */
    type : IBufferType;
    /**
     * The `Period` linked to the `PeriodStream` we just removed.
     *
     * The combination of this and `Period` should give you enough information
     * about which `PeriodStream` has been removed.
     */
    period : Period;
  };
  /** Emitted when a new `Adaptation` is being considered. */
  adaptationChange: IAdaptationChangeEventPayload;
  /** Emitted as new bitrate estimates are done. */
  bitrateEstimationChange: {
    /** The type of buffer for which the estimation is done. */
    type : IBufferType;
    /**
     * The bitrate estimate, in bits per seconds. `undefined` when no bitrate
     * estimate is currently available.
     */
    bitrate : number|undefined;
  };
  /** Emitted when a new `Representation` is being considered. */
  representationChange: {
    /** The type of buffer linked to that `RepresentationStream`. */
    type : IBufferType;
    /** The `Period` linked to the `RepresentationStream` we're creating. */
    period : Period;
    /**
     * The `Representation` linked to the `RepresentationStream` we're creating.
     * `null` when we're choosing no Representation at all.
     */
    representation : Representation |
                     null;
  };
  /** Emitted after a new segment has been succesfully added to the SegmentBuffer */
  addedSegment: {
    /** Context about the content that has been added. */
    content: { period : Period;
               adaptation : Adaptation;
               representation : Representation; };
    /** The concerned Segment. */
    segment : ISegment;
    /** TimeRanges of the concerned SegmentBuffer after the segment was pushed. */
    buffered : TimeRanges;
    /* The data pushed */
    segmentData : unknown;
  };
  /**
   * Event emitted when one or multiple inband events (i.e. events inside a
   * given segment) have been encountered.
   */
  inbandEvents : IInbandEvent[];
}

export interface IAdaptationChangeEventPayload {
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
}

export type IStallingSituation =
  "seeking" | // Rebuffering after seeking
  "not-ready" | // Rebuffering after low ready state
  "internal-seek" | // Rebuffering after a seek happened inside the player
  "buffering" | // Other rebuffering cases
  "freezing"; // stalled for an unknown reason (might be waiting for
              // a decryption key)
