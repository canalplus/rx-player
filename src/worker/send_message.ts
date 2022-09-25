import { IHDRInformation } from "../common/public_types";
import {
  IEncryptionDataEncounteredEvent as IEncryptionDataEncounteredWorkerMessage,
} from "./core/stream";
import { IAdaptationType } from "./manifest";
import { ISentError } from ".";

export default function sendMessage(
  msg : IWorkerMessage,
  transferables? : Transferable[]
) : void {
  if (transferables === undefined) {
    postMessage(msg);
  } else {
    postMessage(msg, transferables);
  }
}

export interface IActivePeriodChangedWorkerMessage {
  type : "activePeriodChanged";
  value : {
    period : ISentPeriod;
  };
}

export interface IWarningWorkerMessage {
  type : "warning";
  contentId : string | undefined;
  value : ISentError;
}

export interface IMediaSourceWorkerMessage {
  type : "media-source";
  contentId : string | undefined;

  /** The MediaSource's handle. */
  value : MediaProvider;
}

export interface IManifestReadyWorkerMessage {
  type : "ready-to-start";
  contentId : string | undefined;
  value : { manifest : ISentManifest };
}

export interface IErrorWorkerMessage {
  type : "error";
  contentId : string | undefined;
  value : ISentError;
}

export interface ISentManifest {
  /**
   * ID uniquely identifying this Manifest.
   * No two Manifests should have this ID.
   * This ID is automatically calculated each time a `Manifest` instance is
   * created.
   */
  id : string;
  /**
   * List every Period in that Manifest chronologically (from start to end).
   * A Period contains information about the content available for a specific
   * period of time.
   */
  periods : ISentPeriod[];

  /**
   * If true, the Manifest can evolve over time:
   * New segments can become available in the future, properties of the manifest
   * can change...
   */
  isDynamic : boolean;

  /**
   * If true, this Manifest describes a live content.
   * A live content is a specific kind of content where you want to play very
   * close to the maximum position (here called the "live edge").
   * E.g., a TV channel is a live content.
   */
  isLive : boolean;

  /**
   * If `true`, no more periods will be added after the current last manifest's
   * Period.
   * `false` if we know that more Period is coming or if we don't know.
   */
  isLastPeriodKnown : boolean;

  /*
   * Every URI linking to that Manifest.
   * They can be used for refreshing the Manifest.
   * Listed from the most important to the least important.
   */
  uris : string[];

  /**
   * Minimum time, in seconds, at which a segment defined in the Manifest
   * can begin.
   * This is also used as an offset for live content to apply to a segment's
   * time.
   */
  availabilityStartTime : number | undefined;
  suggestedPresentationDelay? : number | undefined;
  clockOffset? : number | undefined;

  /**
   * Data allowing to calculate the minimum and maximum seekable positions at
   * any given time.
   */
  timeBounds : {
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
    minimumSafePosition? : number | undefined;
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
    timeshiftDepth : number | null;
    /** Data allowing to calculate the maximum playable position at any given time. */
    maximumTimeData : {
      /**
       * Current position representing live content.
       * Only makes sense for un-ended live contents.
       *
       * `undefined` if unknown or if it doesn't make sense in the current context.
       */
      livePosition : number | undefined;
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
      maximumSafePosition : number;
      /**
       * `Performance.now()` output at the time both `maximumSafePosition` and
       * `livePosition` were calculated.
       * This can be used to retrieve a new maximum position from them when they
       * linearly evolves over time (see `isLinear` property).
       */
      time : number;
    };
  };
}

export interface ISentPeriod {
  /** ID uniquely identifying the ISentPeriod in the ISentManifest. */
  id : string;
  /** Absolute start time of the Period, in seconds. */
  start : number;
  /**
   * Absolute end time of the Period, in seconds.
   * `undefined` for still-running Periods.
   */
  end? : number | undefined;

  adaptations : Partial<Record<IAdaptationType, ISentAdaptation[]>>;
}

export interface ISentAdaptation {
  id : string;
  type : IAdaptationType;
  language? : string | undefined;
  isClosedCaption? : boolean | undefined;
  isAudioDescription? : boolean | undefined;
  isSignInterpreted? : boolean | undefined;
  isSupported : boolean;
  normalizedLanguage? : string | undefined;
  representations : ISentRepresentation[];
  label? : string | undefined;
  isDub? : boolean | undefined;

  trickModeTracks? : ISentAdaptation[] | undefined;
  isTrickModeTrack? : boolean | undefined;
}

export interface ISentRepresentation {
  id : string;
  bitrate : number;
  codec? : string | undefined;
  width? : number | undefined;
  height? : number | undefined;
  frameRate? : string | undefined;
  hdrInfo? : IHDRInformation | undefined;
  decipherable? : boolean | undefined;
}

export type IWorkerMessage = IWarningWorkerMessage |
                             IActivePeriodChangedWorkerMessage |
                             IMediaSourceWorkerMessage |
                             IErrorWorkerMessage |
                             IManifestReadyWorkerMessage |
                             IEncryptionDataEncounteredWorkerMessage;

export { IEncryptionDataEncounteredWorkerMessage };
