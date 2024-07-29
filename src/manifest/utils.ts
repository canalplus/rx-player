import log from "../log";
import type { IProcessedProtectionData } from "../main_thread/types";
import type { IManifest, IPeriod, IPeriodsUpdateResult } from "../manifest";
import type {
  // IAudioRepresentation,
  IAudioTrack,
  IRepresentationFilter,
  ITextTrack,
  ITrackType,
  // IVideoRepresentation,
  IVideoTrack,
} from "../public_types";
import areArraysOfNumbersEqual from "../utils/are_arrays_of_numbers_equal";
import arrayFind from "../utils/array_find";
// import isNullOrUndefined from "../utils/is_null_or_undefined";
import getMonotonicTimeStamp from "../utils/monotonic_timestamp";
// import { objectValues } from "../utils/object_values";
import type {
  IAudioTrackMetadata,
  IManifestMetadata,
  IPeriodMetadata,
  IRepresentationMetadata,
  ITextTrackMetadata,
  ITrackMetadata,
  IVideoTrackMetadata,
} from "./types";

/** List in an array every possible value for the track's `trackType` property. */
export const SUPPORTED_TRACK_TYPE: ITrackType[] = ["audio", "video", "text"];

/**
 * Returns the theoretical minimum playable position on the content
 * regardless of the current track chosen, as estimated at parsing
 * time.
 * @param {Object} manifest
 * @returns {number}
 */
export function getMinimumSafePosition(manifest: IManifestMetadata): number {
  const windowData = manifest.timeBounds;
  if (windowData.timeshiftDepth === null) {
    return windowData.minimumSafePosition ?? 0;
  }

  const { maximumTimeData } = windowData;
  let maximumTime: number;
  if (!windowData.maximumTimeData.isLinear) {
    maximumTime = maximumTimeData.maximumSafePosition;
  } else {
    const timeDiff = getMonotonicTimeStamp() - maximumTimeData.time;
    maximumTime = maximumTimeData.maximumSafePosition + timeDiff / 1000;
  }
  const theoricalMinimum = maximumTime - windowData.timeshiftDepth;
  return Math.max(windowData.minimumSafePosition ?? 0, theoricalMinimum);
}

/**
 * Get the position of the live edge - that is, the position of what is
 * currently being broadcasted, in seconds.
 * @param {Object} manifest
 * @returns {number|undefined}
 */
export function getLivePosition(manifest: IManifestMetadata): number | undefined {
  const { maximumTimeData } = manifest.timeBounds;
  if (!manifest.isLive || maximumTimeData.livePosition === undefined) {
    return undefined;
  }
  if (!maximumTimeData.isLinear) {
    return maximumTimeData.livePosition;
  }
  const timeDiff = getMonotonicTimeStamp() - maximumTimeData.time;
  return maximumTimeData.livePosition + timeDiff / 1000;
}

/**
 * Returns the theoretical maximum playable position on the content
 * regardless of the current track chosen, as estimated at parsing
 * time.
 * @param {Object} manifest
 * @returns {number}
 */
export function getMaximumSafePosition(manifest: IManifestMetadata): number {
  const { maximumTimeData } = manifest.timeBounds;
  if (!maximumTimeData.isLinear) {
    return maximumTimeData.maximumSafePosition;
  }
  const timeDiff = getMonotonicTimeStamp() - maximumTimeData.time;
  return maximumTimeData.maximumSafePosition + timeDiff / 1000;
}

// /**
//  * Returns tracks that contain Representations in supported codecs.
//  * @param {string|undefined} type - If set filter on a specific track's
//  * type. Will return for all types if `undefined`.
//  * @returns {Array.<Adaptation>}
//  */
// export function getSupportedAdaptations(
//   period: IPeriod,
//   type?: ITrackType | undefined,
// ): IAdaptation[];
// export function getSupportedAdaptations(
//   period: IPeriodMetadata,
//   type?: ITrackType | undefined,
// ): IAdaptationMetadata[];
// export function getSupportedAdaptations(
//   period: IPeriod | IPeriodMetadata,
//   type?: ITrackType | undefined,
// ): IAdaptationMetadata[] | IAdaptation[] {
//   if (type === undefined) {
//     return getAdaptations(period).filter((ada) => {
//       return ada.isSupported === true;
//     });
//   }
//   const adaptationsForType = period.adaptations[type];
//   if (adaptationsForType === undefined) {
//     return [];
//   }
//   return adaptationsForType.filter((ada) => {
//     return ada.isSupported === true;
//   });
// }

/**
 * Returns the Period encountered at the given time.
 * Returns `undefined` if there is no Period exactly at the given time.
 * @param {Object} manifest
 * @param {number} time
 * @returns {Object|undefined}
 */
export function getPeriodForTime(manifest: IManifest, time: number): IPeriod | undefined;
export function getPeriodForTime(
  manifest: IManifestMetadata,
  time: number,
): IPeriodMetadata | undefined;
export function getPeriodForTime(
  manifest: IManifestMetadata | IManifest,
  time: number,
): IPeriod | IPeriodMetadata | undefined {
  let nextPeriod = null;
  for (let i = manifest.periods.length - 1; i >= 0; i--) {
    const period = manifest.periods[i];
    if (periodContainsTime(period, time, nextPeriod)) {
      return period;
    }
    nextPeriod = period;
  }
}

/**
 * Returns the Period coming chronologically just after another given Period.
 * Returns `undefined` if not found.
 * @param {Object} manifest
 * @param {Object} period
 * @returns {Object|null}
 */
export function getPeriodAfter(manifest: IManifest, period: IPeriod): IPeriod | null;
export function getPeriodAfter(
  manifest: IManifestMetadata,
  period: IPeriodMetadata,
): IPeriodMetadata | null;
export function getPeriodAfter(
  manifest: IManifestMetadata | IManifest,
  period: IPeriodMetadata | IPeriod,
): IPeriod | IPeriodMetadata | null {
  const endOfPeriod = period.end;
  if (endOfPeriod === undefined) {
    return null;
  }
  const nextPeriod = arrayFind(manifest.periods, (_period) => {
    return _period.end === undefined || endOfPeriod < _period.end;
  });
  return nextPeriod === undefined ? null : nextPeriod;
}

/**
 * Returns true if the give time is in the time boundaries of this `Period`.
 * @param {Object} period - The `Period` which we want to check.
 * @param {number} time
 * @param {object|null} nextPeriod - Period coming chronologically just
 * after in the same Manifest. `null` if this instance is the last `Period`.
 * @returns {boolean}
 */
export function periodContainsTime(
  period: IPeriodMetadata,
  time: number,
  nextPeriod: IPeriodMetadata | null,
): boolean {
  if (time >= period.start && (period.end === undefined || time < period.end)) {
    return true;
  } else if (
    time === period.end &&
    (nextPeriod === null || nextPeriod.start > period.end)
  ) {
    // The last possible timed position of a Period is ambiguous as it is
    // frequently in common with the start of the next one: is it part of
    // the current or of the next Period?
    // Here we only consider it part of the current Period if it is the
    // only one with that position.
    return true;
  }
  return false;
}

// /**
//  * Returns every `Adaptations` (or `tracks`) linked to that Period, in an
//  * Array.
//  * @returns {Array.<Object>}
//  */
// export function getAdaptations(period: IPeriod): IAdaptation[];
// export function getAdaptations(period: IPeriodMetadata): IAdaptationMetadata[];
// export function getAdaptations(
//   period: IPeriodMetadata | IPeriod,
// ): IAdaptationMetadata[] | IAdaptation[] {
//   const adaptationsByType = period.adaptations;
//   return objectValues(adaptationsByType).reduce<IAdaptationMetadata[]>(
//     // Note: the second case cannot happen. TS is just being dumb here
//     (acc, adaptations) =>
//       !isNullOrUndefined(adaptations) ? acc.concat(adaptations) : acc,
//     [],
//   );
// }

/**
 * Format an audio track as an `IAudioTrack`.
 * @param {Object} track
 * @param {boolean} filterPlayable - If `true` only "playable" Representation
 * will be returned.
 * @returns {Object}
 */
export function toAudioTrack(
  track: IAudioTrackMetadata,
  _filterPlayable: boolean,
): IAudioTrack {
  const formatted: IAudioTrack = {
    language: track.language ?? "",
    normalized: track.normalizedLanguage ?? "",
    audioDescription: track.isAudioDescription === true,
    id: track.id,
    representations: [],
    // XXX TODO
    // representations: (filterPlayable
    //   ? track.representations.filter(
    //       (r) => r.isSupported === true && r.decipherable !== false,
    //     )
    //   : track.representations
    // ).map(toAudioRepresentation),
    label: track.label,
  };
  if (track.isDub === true) {
    formatted.dub = true;
  }
  return formatted;
}

/**
 * Format a text track as an `ITextTrack`.
 * @param {Object} track
 * @returns {Object}
 */
export function toTextTrack(track: ITextTrackMetadata): ITextTrack {
  return {
    language: track.language ?? "",
    normalized: track.normalizedLanguage ?? "",
    closedCaption: track.isClosedCaption === true,
    id: track.id,
    label: track.label,
    forced: track.isForcedSubtitles,
  };
}

/**
 * Format a video track as an `IVideoTrack`.
 * @param {Object} track
 * @param {boolean} filterPlayable - If `true` only "playable" Representation
 * will be returned.
 * @returns {Object}
 */
export function toVideoTrack(
  track: IVideoTrackMetadata,
  _filterPlayable: boolean,
): IVideoTrack {
  const trickModeTracks: IVideoTrack[] = [];
  // XXX TODO
  // const trickModeTracks =
  //   track.trickModeTracks !== undefined
  //     ? track.trickModeTracks.map((trickModeAdaptation) => {
  //         const representations = (
  //           filterPlayable
  //             ? trickModeAdaptation.representations.filter(
  //                 (r) => r.isSupported === true && r.decipherable !== false,
  //               )
  //             : trickModeAdaptation.representations
  //         ).map(toVideoRepresentation);
  //         const trickMode: IVideoTrack = {
  //           id: trickModeAdaptation.id,
  //           representations,
  //           isTrickModeTrack: true,
  //         };
  //         if (trickModeAdaptation.isSignInterpreted === true) {
  //           trickMode.signInterpreted = true;
  //         }
  //         return trickMode;
  //       })
  //     : undefined;

  const videoTrack: IVideoTrack = {
    id: track.id,
    representations: [],
    // XXX TODO
    // representations: (filterPlayable
    //   ? track.representations.filter(
    //       (r) => r.isSupported === true && r.decipherable !== false,
    //     )
    //   : track.representations
    // ).map(toVideoRepresentation),
    label: track.label,
  };
  if (track.isSignInterpreted === true) {
    videoTrack.signInterpreted = true;
  }
  if (track.isTrickModeTrack === true) {
    videoTrack.isTrickModeTrack = true;
  }
  if (trickModeTracks !== undefined) {
    videoTrack.trickModeTracks = trickModeTracks;
  }
  return videoTrack;
}

// /**
//  * Format Representation as an `IAudioRepresentation`.
//  * @returns {Object}
//  */
// function toAudioRepresentation(
//   representation: IRepresentationMetadata,
// ): IAudioRepresentation {
//   const { id, bitrate, codecs, isSpatialAudio, isSupported, decipherable } =
//     representation;
//   return {
//     id,
//     bitrate,
//     codec: codecs?.[0],
//     isSpatialAudio,
//     isCodecSupported: isSupported,
//     decipherable,
//   };
// }

// /**
//  * Format Representation as an `IVideoRepresentation`.
//  * @returns {Object}
//  */
// function toVideoRepresentation(
//   representation: IRepresentationMetadata,
// ): IVideoRepresentation {
//   const {
//     id,
//     bitrate,
//     frameRate,
//     width,
//     height,
//     codecs,
//     hdrInfo,
//     isSupported,
//     decipherable,
//   } = representation;
//   return {
//     id,
//     bitrate,
//     frameRate,
//     width,
//     height,
//     codec: codecs?.[0],
//     hdrInfo,
//     isCodecSupported: isSupported,
//     decipherable,
//   };
// }

export function toTaggedTrack(track: ITrackMetadata): ITaggedTrack {
  switch (track.trackType) {
    case "audio":
      return { type: "audio", track: toAudioTrack(track, false) };
    case "video":
      return { type: "video", track: toVideoTrack(track, false) };
    case "text":
      return { type: "text", track: toTextTrack(track) };
  }
}

/**
 * Information on a Representation affected by a `decipherabilityUpdates` event.
 */
export interface IDecipherabilityStatusChangedElement {
  manifest: IManifestMetadata;
  period: IPeriodMetadata;
  track: ITrackMetadata;
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
export function updateDecipherabilityFromKeyIds(
  manifest: IManifestMetadata,
  updates: {
    whitelistedKeyIds: Uint8Array[];
    blacklistedKeyIds: Uint8Array[];
    delistedKeyIds: Uint8Array[];
  },
): IDecipherabilityStatusChangedElement[] {
  const { whitelistedKeyIds, blacklistedKeyIds, delistedKeyIds } = updates;
  return updateRepresentationsDeciperability(manifest, (representation) => {
    if (representation.contentProtections === undefined) {
      return representation.decipherable;
    }
    const contentKIDs = representation.contentProtections.keyIds;
    if (contentKIDs !== undefined) {
      for (const elt of contentKIDs) {
        for (const blacklistedKeyId of blacklistedKeyIds) {
          if (areArraysOfNumbersEqual(blacklistedKeyId, elt.keyId)) {
            return false;
          }
        }
        for (const whitelistedKeyId of whitelistedKeyIds) {
          if (areArraysOfNumbersEqual(whitelistedKeyId, elt.keyId)) {
            return true;
          }
        }
        for (const delistedKeyId of delistedKeyIds) {
          if (areArraysOfNumbersEqual(delistedKeyId, elt.keyId)) {
            return undefined;
          }
        }
      }
    }
    return representation.decipherable;
  });
}

/**
 * Update decipherability to `false` to any Representation which is linked to
 * the given initialization data.
 * @param {Object} manifest
 * @param {Object} initData
 */
export function updateDecipherabilityFromProtectionData(
  manifest: IManifestMetadata,
  initData: IProcessedProtectionData,
): IDecipherabilityStatusChangedElement[] {
  return updateRepresentationsDeciperability(manifest, (representation) => {
    if (representation.decipherable === false) {
      return false;
    }
    const segmentProtections = representation.contentProtections?.initData ?? [];
    for (const protection of segmentProtections) {
      if (initData.type === undefined || protection.type === initData.type) {
        const containedInitData = initData.values
          .getFormattedValues()
          .every((undecipherableVal) => {
            return protection.values.some((currVal) => {
              return (
                (undecipherableVal.systemId === undefined ||
                  currVal.systemId === undecipherableVal.systemId) &&
                areArraysOfNumbersEqual(currVal.data, undecipherableVal.data)
              );
            });
          });
        if (containedInitData) {
          return false;
        }
      }
    }
    return representation.decipherable;
  });
}

/**
 * Update `decipherable` property of every `Representation` found in the
 * Manifest based on the result of a `isDecipherable` callback:
 *   - When that callback returns `true`, update `decipherable` to `true`
 *   - When that callback returns `false`, update `decipherable` to `false`
 *   - When that callback returns `undefined`, update `decipherable` to
 *     `undefined`
 * @param {Manifest} manifest
 * @param {Function} isDecipherable
 * @returns {Array.<Object>}
 */
function updateRepresentationsDeciperability(
  manifest: IManifestMetadata,
  isDecipherable: (rep: IRepresentationMetadata) => boolean | undefined,
): IDecipherabilityStatusChangedElement[] {
  const updates: IDecipherabilityStatusChangedElement[] = [];
  for (const period of manifest.periods) {
    for (const variantStream of period.variantStreams) {
      for (const trackType of ["audio", "video", "text"] as const) {
        for (const media of variantStream.media[trackType]) {
          for (const representation of media.representations) {
            const track = period.tracksMetadata[trackType][media.linkedTrackId];
            if (track === undefined) {
              log.warn("Manifest: Track linked to Representation not found");
              continue;
            }
            const content = { manifest, period, track, representation };
            const result = isDecipherable(representation);
            if (result !== representation.decipherable) {
              updates.push(content);
              representation.decipherable = result;
              log.debug(
                `Decipherability changed for "${representation.id}"`,
                `(${representation.bitrate})`,
                String(representation.decipherable),
              );
            }
          }
        }
      }
    }
  }
  return updates;
}

/**
 *
 * TODO that function is kind of very ugly, yet should work.
 * Maybe find out a better system for Manifest updates.
 * @param {Object} baseManifest
 * @param {Object} newManifest
 * @param {Array.<Object>} updates
 */
export function replicateUpdatesOnManifestMetadata(
  _baseManifest: IManifestMetadata,
  _newManifest: Omit<IManifestMetadata, "periods">,
  _updates: IPeriodsUpdateResult,
) {
  // XXX TODO
  // for (const prop of Object.keys(newManifest)) {
  //   if (prop !== "periods") {
  //     // eslint-disable-next-line
  //     (baseManifest as any)[prop] = (newManifest as any)[prop];
  //   }
  // }
  // for (const removedPeriod of updates.removedPeriods) {
  //   for (let periodIdx = 0; periodIdx < baseManifest.periods.length; periodIdx++) {
  //     if (baseManifest.periods[periodIdx].id === removedPeriod.id) {
  //       baseManifest.periods.splice(periodIdx, 1);
  //       break;
  //     }
  //   }
  // }
  // for (const updatedPeriod of updates.updatedPeriods) {
  //   for (let periodIdx = 0; periodIdx < baseManifest.periods.length; periodIdx++) {
  //     const newPeriod = updatedPeriod.period;
  //     if (baseManifest.periods[periodIdx].id === updatedPeriod.period.id) {
  //       const basePeriod = baseManifest.periods[periodIdx];
  //       for (const prop of Object.keys(newPeriod)) {
  //         if (prop !== "adaptations") {
  //           // eslint-disable-next-line
  //           (basePeriod as any)[prop] = (newPeriod as any)[prop];
  //         }
  //       }
  //       for (const removedAdaptation of updatedPeriod.result.removedAdaptations) {
  //         const ttype = removedAdaptation.trackType;
  //         const adaptationsForType = basePeriod.adaptations[ttype] ?? [];
  //         for (let adapIdx = 0; adapIdx < adaptationsForType.length; adapIdx++) {
  //           if (adaptationsForType[adapIdx].id === removedAdaptation.id) {
  //             adaptationsForType.splice(adapIdx, 1);
  //             break;
  //           }
  //         }
  //       }
  //       for (const updatedAdaptation of updatedPeriod.result.updatedAdaptations) {
  //         const newAdaptation = updatedAdaptation.adaptation;
  //         const ttype = updatedAdaptation.trackType;
  //         const adaptationsForType = basePeriod.adaptations[ttype] ?? [];
  //         for (let adapIdx = 0; adapIdx < adaptationsForType.length; adapIdx++) {
  //           if (adaptationsForType[adapIdx].id === newAdaptation) {
  //             const baseAdaptation = adaptationsForType[adapIdx];
  //             for (const removedRepresentation of updatedAdaptation.removedRepresentations) {
  //               for (
  //                 let repIdx = 0;
  //                 repIdx < baseAdaptation.representations.length;
  //                 repIdx++
  //               ) {
  //                 if (
  //                   baseAdaptation.representations[repIdx].id === removedRepresentation
  //                 ) {
  //                   baseAdaptation.representations.splice(repIdx, 1);
  //                   break;
  //                 }
  //               }
  //             }
  //             for (const newRepresentation of updatedAdaptation.updatedRepresentations) {
  //               for (
  //                 let repIdx = 0;
  //                 repIdx < baseAdaptation.representations.length;
  //                 repIdx++
  //               ) {
  //                 if (
  //                   baseAdaptation.representations[repIdx].id === newRepresentation.id
  //                 ) {
  //                   const baseRepresentation = baseAdaptation.representations[repIdx];
  //                   for (const prop of Object.keys(newRepresentation) as Array<
  //                     keyof IRepresentationMetadata
  //                   >) {
  //                     if (prop !== "decipherable" && prop !== "isSupported") {
  //                       // eslint-disable-next-line
  //                       (baseRepresentation as any)[prop] = newRepresentation[prop];
  //                     }
  //                   }
  //                   break;
  //                 }
  //               }
  //             }
  //             for (const addedRepresentation of updatedAdaptation.addedRepresentations) {
  //               baseAdaptation.representations.push(addedRepresentation);
  //             }
  //             break;
  //           }
  //         }
  //       }
  //       for (const addedAdaptation of updatedPeriod.result.addedAdaptations) {
  //         const ttype = addedAdaptation.type;
  //         const adaptationsForType = basePeriod.adaptations[ttype];
  //         if (adaptationsForType === undefined) {
  //           basePeriod.adaptations[ttype] = [addedAdaptation];
  //         } else {
  //           adaptationsForType.push(addedAdaptation);
  //         }
  //       }
  //       break;
  //     }
  //   }
  // }
  // for (const addedPeriod of updates.addedPeriods) {
  //   for (let periodIdx = 0; periodIdx < baseManifest.periods.length; periodIdx++) {
  //     if (baseManifest.periods[periodIdx].start > addedPeriod.start) {
  //       baseManifest.periods.splice(periodIdx, 0, addedPeriod);
  //       break;
  //     }
  //   }
  //   baseManifest.periods.push(addedPeriod);
  // }
}

export function createRepresentationFilterFromFnString(
  fnString: string,
): IRepresentationFilter {
  // eslint-disable-next-line @typescript-eslint/no-implied-eval
  return new Function(
    `return (${fnString}(arguments[0], arguments[1]))`,
  ) as IRepresentationFilter;
}

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
