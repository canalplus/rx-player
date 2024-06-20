import log from "../../log";
import type {
  IAdaptation,
  IManifest,
  IPeriod,
  IRepresentation,
  ISegment,
} from "../../manifest";
import type {
  IReadOnlyPlaybackObserver,
  IRebufferingStatus,
  ObservationPosition,
} from "../../playback_observer";
import type { ICmcdOptions, ICmcdPayload, ITrackType } from "../../public_types";
import createUuid from "../../utils/create_uuid";
import isNullOrUndefined from "../../utils/is_null_or_undefined";
import type { IRange } from "../../utils/ranges";
import TaskCanceller from "../../utils/task_canceller";

/**
 * `rtp`, for "REQUESTED_MAXIMUM_THROUGHPUT", indicates the maximum throughput
 * needed to load a given segment without experience degration.
 * It acts as a hint to a CDN so it can scale its resources between multiple
 * clients.
 *
 * We could indicate through `rtp` the exact minimum bandwidth needed, but this
 * may lead to much higher risk of rebuffering, so we prefer to multiply that
 * value by a safe-enough factor, this `RTP_FACTOR`.
 */
const RTP_FACTOR = 4;

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
  private _sessionId: string;
  private _contentId: string;
  private _typePreference: TypePreference;
  private _lastThroughput: Partial<Record<ITrackType, number | undefined>>;
  private _playbackObserver: IReadOnlyPlaybackObserver<ICmcdDataBuilderPlaybackObservation> | null;
  private _bufferStarvationToggle: boolean;
  private _canceller: TaskCanceller | null;

  constructor(options: ICmcdOptions) {
    this._sessionId = options.sessionId ?? createUuid();
    this._contentId = options.contentId ?? createUuid();
    this._typePreference =
      options.communicationType === "headers"
        ? TypePreference.Headers
        : TypePreference.QueryString;
    this._bufferStarvationToggle = false;
    this._playbackObserver = null;
    this._lastThroughput = {};
    this._canceller = null;
  }

  public startMonitoringPlayback(
    playbackObserver: IReadOnlyPlaybackObserver<ICmcdDataBuilderPlaybackObservation>,
  ): void {
    this._canceller?.cancel();
    this._canceller = new TaskCanceller();
    this._playbackObserver = playbackObserver;
    playbackObserver.listen(
      (obs) => {
        if (obs.rebuffering !== null) {
          this._bufferStarvationToggle = true;
        }
      },
      { includeLastObservation: true, clearSignal: this._canceller.signal },
    );
  }

  public stopMonitoringPlayback(): void {
    this._canceller?.cancel();
    this._canceller = null;
    this._playbackObserver = null;
  }

  public updateThroughput(trackType: ITrackType, throughput: number | undefined) {
    this._lastThroughput[trackType] = throughput;
  }

  private _getCommonCmcdData(lastThroughput: number | undefined): ICmcdProperties {
    const props: ICmcdProperties = {};
    props.bs = this._bufferStarvationToggle;
    this._bufferStarvationToggle = false;
    props.cid = this._contentId;
    props.mtp =
      lastThroughput !== undefined
        ? Math.floor(Math.round(lastThroughput / 1000 / 100) * 100)
        : undefined;
    props.sid = this._sessionId;

    const lastObservation = this._playbackObserver?.getReference().getValue();
    props.pr =
      lastObservation === undefined || lastObservation.speed === 1
        ? undefined
        : lastObservation.speed;
    if (lastObservation !== undefined) {
      props.su = lastObservation.rebuffering !== null;
    }

    return props;
  }

  public getCmcdDataForManifest(transportType: string): ICmcdPayload {
    const props = this._getCommonCmcdData(
      this._lastThroughput.video ?? this._lastThroughput.audio,
    );
    props.ot = "m";

    switch (transportType) {
      case "dash":
        props.sf = "d";
        break;
      case "smooth":
        props.sf = "s";
        break;
      default:
        props.sf = "o";
        break;
    }
    return this._producePayload(props);
  }

  public getCmcdDataForSegmentRequest(content: ICmcdSegmentInfo): ICmcdPayload {
    const lastObservation = this._playbackObserver?.getReference().getValue();

    const props = this._getCommonCmcdData(this._lastThroughput[content.adaptation.type]);
    props.br = Math.round(content.representation.bitrate / 1000);
    props.d = Math.round(content.segment.duration * 1000);
    // TODO nor (next object request) and nrr (next range request)

    switch (content.adaptation.type) {
      case "video":
        props.ot = "v";
        break;
      case "audio":
        props.ot = "a";
        break;
      case "text":
        props.ot = "c";
        break;
    }
    if (content.segment.isInit) {
      props.ot = "i";
    }

    let precizeBufferLengthMs;
    if (
      lastObservation !== undefined &&
      (props.ot === "v" || props.ot === "a" || props.ot === "av")
    ) {
      const bufferedForType = lastObservation.buffered[content.adaptation.type];
      if (!isNullOrUndefined(bufferedForType)) {
        // TODO more precize position estimate?
        const position =
          this._playbackObserver?.getCurrentTime() ??
          lastObservation.position.getWanted() ??
          lastObservation.position.getPolled();
        for (const range of bufferedForType) {
          if (position >= range.start && position < range.end) {
            precizeBufferLengthMs = (range.end - position) * 1000;
            props.bl = Math.floor(Math.round(precizeBufferLengthMs / 100) * 100);
            break;
          }
        }
      }
    }

    const precizeDeadlineMs =
      precizeBufferLengthMs === undefined || lastObservation === undefined
        ? undefined
        : precizeBufferLengthMs / lastObservation.speed;

    props.dl =
      precizeDeadlineMs === undefined
        ? undefined
        : Math.floor(Math.round(precizeDeadlineMs / 100) * 100);

    if (precizeDeadlineMs !== undefined) {
      // estimate the file size, in kilobits
      const estimatedFileSizeKb =
        (content.representation.bitrate * content.segment.duration) / 1000;
      const wantedCeilBandwidthKbps = estimatedFileSizeKb / (precizeDeadlineMs / 1000);
      props.rtp = Math.floor(
        Math.round((wantedCeilBandwidthKbps * RTP_FACTOR) / 100) * 100,
      );
    }

    switch (content.manifest.transport) {
      case "dash":
        props.sf = "d";
        break;
      case "smooth":
        props.sf = "s";
        break;
      default:
        props.sf = "o";
        break;
    }
    props.st = content.manifest.isDynamic ? "l" : "v";
    props.tb = content.adaptation.representations.reduce(
      (acc: number | undefined, representation: IRepresentation) => {
        if (
          representation.isSupported !== true ||
          representation.decipherable === false
        ) {
          return acc;
        }
        if (acc === undefined) {
          return Math.round(representation.bitrate / 1000);
        }
        return Math.max(acc, Math.round(representation.bitrate / 1000));
      },
      undefined,
    );
    return this._producePayload(props);
  }

  private _producePayload(props: ICmcdProperties): ICmcdPayload {
    let cmcdObjectValue = "";
    let cmcdRequestValue = "";
    let cmcdSessionValue = "";
    let cmcdStatusValue = "";
    let queryStringPayload = "";
    if (props.br !== undefined) {
      queryStringPayload += `br=${String(props.br)},`;
      const toAdd = `br=${String(props.br)},`;
      if (this._typePreference === TypePreference.Headers) {
        cmcdObjectValue += toAdd;
      } else {
        queryStringPayload += toAdd;
      }
    }
    if (props.bl !== undefined) {
      const toAdd = `bl=${String(props.bl)},`;
      if (this._typePreference === TypePreference.Headers) {
        cmcdRequestValue += toAdd;
      } else {
        queryStringPayload += toAdd;
      }
    }
    if (props.bs === true) {
      const toAdd = "bs,";
      if (this._typePreference === TypePreference.Headers) {
        cmcdStatusValue += toAdd;
      } else {
        queryStringPayload += toAdd;
      }
    }
    if (props.cid !== undefined) {
      const toAdd = `cid=${formatStringPayload(props.cid)},`;
      if (this._typePreference === TypePreference.Headers) {
        cmcdSessionValue += toAdd;
      } else {
        queryStringPayload += toAdd;
      }
    }
    if (props.d !== undefined) {
      const toAdd = `d=${String(props.d)},`;
      if (this._typePreference === TypePreference.Headers) {
        cmcdObjectValue += toAdd;
      } else {
        queryStringPayload += toAdd;
      }
    }
    if (props.dl !== undefined) {
      const toAdd = `dl=${String(props.dl)},`;
      if (this._typePreference === TypePreference.Headers) {
        cmcdRequestValue += toAdd;
      } else {
        queryStringPayload += toAdd;
      }
    }
    if (props.mtp !== undefined) {
      const toAdd = `mtp=${String(props.mtp)},`;
      if (this._typePreference === TypePreference.Headers) {
        cmcdRequestValue += toAdd;
      } else {
        queryStringPayload += toAdd;
      }
    }
    if (props.ot !== undefined) {
      const toAdd = `ot=${props.ot},`;
      if (this._typePreference === TypePreference.Headers) {
        cmcdObjectValue += toAdd;
      } else {
        queryStringPayload += toAdd;
      }
    }
    if (props.pr !== undefined) {
      const toAdd = `pr=${String(props.pr)},`;
      if (this._typePreference === TypePreference.Headers) {
        cmcdSessionValue += toAdd;
      } else {
        queryStringPayload += toAdd;
      }
    }
    if (props.rtp !== undefined) {
      const toAdd = `rtp=${String(props.rtp)},`;
      if (this._typePreference === TypePreference.Headers) {
        cmcdStatusValue += toAdd;
      } else {
        queryStringPayload += toAdd;
      }
    }
    if (props.sf !== undefined) {
      const toAdd = `sf=${props.sf},`;
      if (this._typePreference === TypePreference.Headers) {
        cmcdSessionValue += toAdd;
      } else {
        queryStringPayload += toAdd;
      }
    }
    if (props.sid !== undefined) {
      const toAdd = `sid=${formatStringPayload(props.sid)},`;
      if (this._typePreference === TypePreference.Headers) {
        cmcdSessionValue += toAdd;
      } else {
        queryStringPayload += toAdd;
      }
    }
    if (props.st !== undefined) {
      const toAdd = `st=${props.st},`;
      if (this._typePreference === TypePreference.Headers) {
        cmcdSessionValue += toAdd;
      } else {
        queryStringPayload += toAdd;
      }
    }
    if (props.su === true) {
      const toAdd = "su,";
      if (this._typePreference === TypePreference.Headers) {
        cmcdRequestValue += toAdd;
      } else {
        queryStringPayload += toAdd;
      }
    }
    if (props.tb !== undefined) {
      const toAdd = `tb=${String(props.tb)},`;
      if (this._typePreference === TypePreference.Headers) {
        cmcdObjectValue += toAdd;
      } else {
        queryStringPayload += toAdd;
      }
    }

    if (this._typePreference === TypePreference.Headers) {
      if (cmcdObjectValue[cmcdObjectValue.length - 1] === ",") {
        cmcdObjectValue = cmcdObjectValue.substring(0, cmcdObjectValue.length - 1);
      }
      if (cmcdRequestValue[cmcdRequestValue.length - 1] === ",") {
        cmcdRequestValue = cmcdRequestValue.substring(0, cmcdRequestValue.length - 1);
      }
      if (cmcdSessionValue[cmcdSessionValue.length - 1] === ",") {
        cmcdSessionValue = cmcdSessionValue.substring(0, cmcdSessionValue.length - 1);
      }
      if (cmcdStatusValue[cmcdStatusValue.length - 1] === ",") {
        cmcdStatusValue = cmcdStatusValue.substring(0, cmcdStatusValue.length - 1);
      }
      log.debug("CMCD: proposing headers payload");
      return {
        type: "headers",
        value: {
          /* eslint-disable @typescript-eslint/naming-convention */
          "CMCD-Object": cmcdObjectValue,
          "CMCD-Request": cmcdRequestValue,
          "CMCD-Session": cmcdSessionValue,
          "CMCD-Status": cmcdStatusValue,
          /* eslint-enable @typescript-eslint/naming-convention */
        },
      };
    }

    if (queryStringPayload[queryStringPayload.length - 1] === ",") {
      queryStringPayload = queryStringPayload.substring(0, queryStringPayload.length - 1);
    }
    queryStringPayload = encodeURIComponent(queryStringPayload);
    log.debug("CMCD: proposing query string payload", queryStringPayload);
    return {
      type: "query",
      value: [["CMCD", queryStringPayload]],
    };
  }
}

/**
 * How CMCD metadata should be communicated.
 */
const enum TypePreference {
  /** The CMCD metadata should be communicated through HTTP request headers. */
  Headers,
  /** The CMCD metadata should be communicated through a query string. */
  QueryString,
}

/** Every properties that can be constructed under the CMCD scheme. */
interface ICmcdProperties {
  /*
   * Encoded bitrate (br)
   * The encoded bitrate of the audio or video object being requested.
   * This may not be known precisely by the player; however, it MAY be
   * estimated based upon playlist/manifest declarations. If the playlist
   * declares both peak and average bitrate values, the peak value should
   * be transmitted.
   *
   * In kbps.
   */
  br?: number | undefined;
  /**
   * Buffer starvation (bs)
   * Key is included without a value if the buffer was starved at some point
   * between the prior request and this object request, resulting in the
   * player being in a rebuffering state and the video or audio playback being
   * stalled. This key MUST NOT be sent if the buffer was not starved since
   * the prior request. If the object type ‘ot’ key is sent along with this
   * key, then the ‘bs’ key refers to the buffer associated with the
   * particular object type. If no object type is communicated, then the
   * buffer state applies to the current session.
   */
  bs?: boolean | undefined;
  /**
   * Buffer length (bl)
   * The buffer length associated with the media object being requested. This
   * value MUST be rounded to the nearest 100 ms. This key SHOULD only be sent
   * with an object type of ‘a’, ‘v’ or ‘av’.
   * In milliseconds
   */
  bl?: number | undefined;
  /**
   * Content ID (cid)
   * A unique string identifying the current content.
   * Maximum length is 64 characters. This value is consistent across
   * multiple different sessions and devices and is defined and
   * updated at the discretion of the service provider
   */
  cid?: string | undefined;

  /**
   * Object duration (d)
   * The playback duration in milliseconds of the object being requested. If
   * a partial segment is being requested, then this value MUST indicate
   * the playback duration of that part and not that of its parent segment.
   * This value can be an approximation of the estimated duration if the
   * explicit value is not known.
   * In milliseconds.
   */
  d?: number | undefined;
  /**
   * Deadline (dl)
   * Deadline from the request time until the first sample of this
   * Segment/Object needs to be available in order to not create a buffer
   * underrun or any other playback problems. This value MUST be rounded to
   * the nearest 100ms. For a playback rate of 1, this may be equivalent to
   * the player’s remaining buffer length.
   * In milliseconds.
   */
  dl?: number | undefined;
  /**
   * Measured throughput (mtp)
   * The throughput between client and server, as measured by the client and
   * MUST be rounded to the nearest 100 kbps. This value, however derived,
   * SHOULD be the value that the client is using to make its next Adaptive
   * Bitrate switching decision.
   * If the client is connected to multiple servers concurrently, it must take
   * care to report only the throughput measured against the receiving server.
   * If the client has multiple concurrent connections to the server, then the
   * intent is that this value communicates the aggregate throughput the
   * client sees across all those connections.
   * In kbps.
   */
  mtp?: number | undefined;
  /**
   * Object type (ot)
   * The media type of the current object being requested:
   *   - m = text file, such as a manifest or playlist
   *   - a = audio only
   *   - v = video only
   *   - av = muxed audio and video
   *   - i = init segment
   *   - c = caption or subtitle
   *   - tt = ISOBMFF timed text track
   *   - k = cryptographic key, license or certificate.
   *   - o = other
   * If the object type being requested is unknown, then this key MUST NOT be used.
   */
  ot?: string | undefined;
  /**
   * Playback rate (pr)
   * 1 if real-time, 2 if double speed, 0 if not playing.
   * SHOULD only be sent if not equal to 1.
   */
  pr?: number | undefined;
  /**
   * Requested maximum throughput (rtp)
   * The requested maximum throughput that the client considers sufficient
   * for delivery of the asset.
   * Values MUST be rounded to the nearest 100kbps.
   * For example, a client would indicate that the current segment, encoded at
   * 2Mbps, is to be delivered at no more than 10Mbps, by using rtp=10000.
   * Note: This can benefit clients by preventing buffer saturation through
   * over-delivery and can also deliver a community benefit through fair-share
   * delivery. The concept is that each client receives the throughput
   * necessary for great performance, but no more. The CDN may not support the
   * rtp feature.
   * In kbps.
   */
  rtp?: number | undefined;
  /**
   * Streaming format (sf)
   * The streaming format that defines the current request.
   *   - d = MPEG DASH
   *   - h = HTTP Live Streaming (HLS)
   *   - s = Smooth Streaming
   *   - o = other
   * If the streaming format being requested is unknown, then this key MUST
   * NOT be used.
   */
  sf?: string | undefined;
  /**
   * Session ID (sid)
   * A GUID identifying the current playback session. A playback session
   * typically ties together segments belonging to a single media asset.
   * Maximum length is 64 characters. It is RECOMMENDED to conform to the
   * UUID specification
   */
  sid?: string | undefined;
  /**
   * Stream type (st)
   * v = all segments are available – e.g., VOD
   * l = segments become available over time – e.g., LIVE
   */
  st?: string | undefined;
  /**
   * Startup (su)
   * Key is included without a value if the object is needed urgently due to
   * startup, seeking or recovery after a buffer-empty event. The media SHOULD
   * not be rendering when this request is made. This key MUST not be sent if
   * it is FALSE.
   */
  su?: boolean | undefined;
  /**
   * Top bitrate (tb)
   * The highest bitrate rendition in the manifest or playlist that the client
   * is allowed to play, given current codec, licensing and sizing constraints.
   * In kbps.
   */
  tb?: number | undefined;
}

function formatStringPayload(str: string): string {
  return `"${str.replace("\\", "\\\\").replace('"', '\\"')}"`;
}
