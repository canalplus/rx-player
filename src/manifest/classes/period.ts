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
import type {
  ICdnMetadata,
  IManifestStreamEvent,
  IParsedPeriod,
} from "../../parsers/manifest";
import type { ITrackType, IRepresentationFilter } from "../../public_types";
import arrayFind from "../../utils/array_find";
import isNullOrUndefined from "../../utils/is_null_or_undefined";
import type { IAdaptationMetadata, IPeriodMetadata } from "../types";
import { getAdaptations, getSupportedAdaptations, periodContainsTime } from "../utils";
import Adaptation from "./adaptation";
import type CodecSupportCache from "./codec_support_cache";
import type { IRepresentationIndex } from "./representation_index";

/** Structure listing every `Adaptation` in a Period. */
export type IManifestAdaptations = Partial<Record<ITrackType, Adaptation[]>>;

/**
 * Class representing the tracks and qualities available from a given time
 * period in the the Manifest.
 * @class Period
 */
export default class Period implements IPeriodMetadata {
  /** ID uniquely identifying the Period in the Manifest. */
  public readonly id: string;

  /** Every 'Adaptation' in that Period, per type of Adaptation. */
  public adaptations: IManifestAdaptations;

  /** Absolute start time of the Period, in seconds. */
  public start: number;

  /**
   * Duration of this Period, in seconds.
   * `undefined` for still-running Periods.
   */
  public duration: number | undefined;

  /**
   * Absolute end time of the Period, in seconds.
   * `undefined` for still-running Periods.
   */
  public end: number | undefined;

  /** Array containing every stream event happening on the period */
  public streamEvents: IManifestStreamEvent[];

  /**
   * If set to an object, this Period has thumbnail tracks.
   */
  public thumbnailTracks: IThumbnailTrack[];

  /**
   * @constructor
   * @param {Object} args
   * @param {Array.<Object>} unsupportedAdaptations - Array on which
   * `Adaptation`s objects which have no supported `Representation` will be
   * pushed.
   * This array might be useful for minor error reporting.
   * @param {function|undefined} [representationFilter]
   */
  constructor(
    args: IParsedPeriod,
    unsupportedAdaptations: Adaptation[],
    cachedCodecSupport: CodecSupportCache,

    representationFilter?: IRepresentationFilter | undefined,
  ) {
    this.id = args.id;
    this.adaptations = (
      Object.keys(args.adaptations) as ITrackType[]
    ).reduce<IManifestAdaptations>((acc, type) => {
      const adaptationsForType = args.adaptations[type];
      if (isNullOrUndefined(adaptationsForType)) {
        return acc;
      }
      const filteredAdaptations = adaptationsForType
        .map((adaptation): Adaptation => {
          const newAdaptation = new Adaptation(adaptation, cachedCodecSupport, {
            representationFilter,
          });
          if (
            newAdaptation.representations.length > 0 &&
            newAdaptation.supportStatus.hasSupportedCodec === false
          ) {
            unsupportedAdaptations.push(newAdaptation);
          }
          return newAdaptation;
        })
        .filter(
          (adaptation): adaptation is Adaptation => adaptation.representations.length > 0,
        );
      if (
        filteredAdaptations.every(
          (adaptation) => adaptation.supportStatus.hasSupportedCodec === false,
        ) &&
        adaptationsForType.length > 0 &&
        (type === "video" || type === "audio")
      ) {
        throw new MediaError(
          "MANIFEST_INCOMPATIBLE_CODECS_ERROR",
          "No supported " + type + " adaptations",
          { tracks: undefined },
        );
      }

      if (filteredAdaptations.length > 0) {
        acc[type] = filteredAdaptations;
      }
      return acc;
    }, {});

    if (
      !Array.isArray(this.adaptations.video) &&
      !Array.isArray(this.adaptations.audio)
    ) {
      throw new MediaError(
        "MANIFEST_PARSE_ERROR",
        "No supported audio and video tracks.",
      );
    }

    this.thumbnailTracks = args.thumbnailTracks.map((thumbnailTrack) => ({
      id: thumbnailTrack.id,
      mimeType: thumbnailTrack.mimeType,
      index: thumbnailTrack.index,
      cdnMetadata: thumbnailTrack.cdnMetadata,
      height: thumbnailTrack.height,
      width: thumbnailTrack.width,
      horizontalTiles: thumbnailTrack.horizontalTiles,
      verticalTiles: thumbnailTrack.verticalTiles,
    }));
    this.duration = args.duration;
    this.start = args.start;

    if (!isNullOrUndefined(this.duration) && !isNullOrUndefined(this.start)) {
      this.end = this.start + this.duration;
    }
    this.streamEvents = args.streamEvents === undefined ? [] : args.streamEvents;
  }

  /**
   * Some environments (e.g. in a WebWorker) may not have the capability to know
   * if a mimetype+codec combination is supported on the current platform.
   *
   * Calling `refreshCodecSupport` manually once the codecs supported are known
   * by the current environnement allows to work-around this issue.
   *
   * @param {Array.<Object>} unsupportedAdaptations - Array on which
   * `Adaptation`s objects which are now known to have no supported
   * `Representation` will be pushed.
   * This array might be useful for minor error reporting.
   * @param {Array.<Object>} cachedCodecSupport
   */
  refreshCodecSupport(
    unsupportedAdaptations: Adaptation[],
    cachedCodecSupport: CodecSupportCache,
  ) {
    (Object.keys(this.adaptations) as ITrackType[]).forEach((ttype) => {
      const adaptationsForType = this.adaptations[ttype];
      if (adaptationsForType === undefined) {
        return;
      }
      let hasSupportedAdaptations: boolean | undefined = false;
      for (const adaptation of adaptationsForType) {
        if (!adaptation.supportStatus.hasCodecWithUndefinedSupport) {
          // Go to next adaptation as an optimisation measure.
          // NOTE this only is true if we never change a codec from supported
          // to unsuported and its opposite.

          if (adaptation.supportStatus.hasSupportedCodec === true) {
            hasSupportedAdaptations = true;
          }
          continue;
        }
        const wasSupported = adaptation.supportStatus.hasSupportedCodec;
        adaptation.refreshCodecSupport(cachedCodecSupport);
        if (
          wasSupported !== false &&
          adaptation.supportStatus.hasSupportedCodec === false
        ) {
          unsupportedAdaptations.push(adaptation);
        }

        if (hasSupportedAdaptations === false) {
          hasSupportedAdaptations = adaptation.supportStatus.hasSupportedCodec;
        } else if (
          hasSupportedAdaptations === undefined &&
          adaptation.supportStatus.hasSupportedCodec === true
        ) {
          hasSupportedAdaptations = true;
        }
      }
      if ((ttype === "video" || ttype === "audio") && hasSupportedAdaptations === false) {
        throw new MediaError(
          "MANIFEST_INCOMPATIBLE_CODECS_ERROR",
          "No supported " + ttype + " adaptations",
          { tracks: undefined },
        );
      }
    }, {});
  }

  /**
   * Returns every `Adaptations` (or `tracks`) linked to that Period, in an
   * Array.
   * @returns {Array.<Object>}
   */
  getAdaptations(): Adaptation[] {
    return getAdaptations(this);
  }

  /**
   * Returns every `Adaptations` (or `tracks`) linked to that Period for a
   * given type.
   * @param {string} adaptationType
   * @returns {Array.<Object>}
   */
  getAdaptationsForType(adaptationType: ITrackType): Adaptation[] {
    const adaptationsForType = this.adaptations[adaptationType];
    return adaptationsForType ?? [];
  }

  /**
   * Returns the Adaptation linked to the given ID.
   * @param {number|string} wantedId
   * @returns {Object|undefined}
   */
  getAdaptation(wantedId: string): Adaptation | undefined {
    return arrayFind(this.getAdaptations(), ({ id }) => wantedId === id);
  }

  /**
   * Returns Adaptations that contain Representations in supported codecs.
   * @param {string|undefined} type - If set filter on a specific Adaptation's
   * type. Will return for all types if `undefined`.
   * @returns {Array.<Adaptation>}
   */
  getSupportedAdaptations(type?: ITrackType | undefined): Adaptation[] {
    return getSupportedAdaptations(this, type);
  }

  /**
   * Returns true if the give time is in the time boundaries of this `Period`.
   * @param {number} time
   * @param {object|null} nextPeriod - Period coming chronologically just
   * after in the same Manifest. `null` if this instance is the last `Period`.
   * @returns {boolean}
   */
  containsTime(time: number, nextPeriod: Period | null): boolean {
    return periodContainsTime(this, time, nextPeriod);
  }

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
  public getMetadataSnapshot(): IPeriodMetadata {
    const adaptations: Partial<Record<ITrackType, IAdaptationMetadata[]>> = {};
    const baseAdaptations = this.getAdaptations();
    for (const adaptation of baseAdaptations) {
      let currentAdaps: IAdaptationMetadata[] | undefined = adaptations[adaptation.type];
      if (currentAdaps === undefined) {
        currentAdaps = [];
        adaptations[adaptation.type] = currentAdaps;
      }
      currentAdaps.push(adaptation.getMetadataSnapshot());
    }
    return {
      start: this.start,
      end: this.end,
      id: this.id,
      streamEvents: this.streamEvents,
      adaptations,
      thumbnailTracks: this.thumbnailTracks.map((thumbnailTrack) => ({
        id: thumbnailTrack.id,
        mimeType: thumbnailTrack.mimeType,
        height: thumbnailTrack.height,
        width: thumbnailTrack.width,
        horizontalTiles: thumbnailTrack.horizontalTiles,
        verticalTiles: thumbnailTrack.verticalTiles,
      })),
    };
  }
}

/**
 * Metadata on an image thumbnail track associated to a Period.
 */
export interface IThumbnailTrack {
  /** Identifier for that thumbnail track. */
  id: string;
  /** interface allowing to obtain information on the actual thumbnails. */
  index: IRepresentationIndex;
  /** Mime-type for loaded thumbnails, allowing to know their format. */
  mimeType: string;
  /** CDN(s) on which the thumbnails may be loaded. */
  cdnMetadata: ICdnMetadata[] | null;
  /**
   * A loaded thumbnail's height in pixels. Note that there can be multiple actual
   * thumbnails per loaded thumbnail resource (see `horizontalTiles` and
   * `verticalTiles` properties.
   */
  height: number;
  /**
   * A loaded thumbnail's width in pixels. Note that there can be multiple actual
   * thumbnails per loaded thumbnail resource (see `horizontalTiles` and
   * `verticalTiles` properties.
   */
  width: number;
  /**
   * Thumbnail tracks are usually grouped together. This is the number of
   * images contained horizontally in a whole loaded thumbnail resource.
   */
  horizontalTiles: number;
  /**
   * Thumbnail tracks are usually grouped together. This is the number of
   * images contained vertically in a whole loaded thumbnail resource.
   */
  verticalTiles: number;
}
