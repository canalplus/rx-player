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

import resolveURL, { normalizeBaseURL } from "../../../utils/resolve_url";
import {
  IParsedAdaptation,
  // IParsedAdaptations,
  // IParsedAdaptationType,
  IParsedManifest,
  IParsedPeriod,
  IParsedRepresentation,
} from "../types";
import getMaximumPosition from "../utils/get_maximum_position";
import getMinimumPosition from "../utils/get_minimum_position";
import createMasterPlaylistIR from "./createMasterPlaylistIR";
// import createMediaPlaylistIR, {
//   IMediaPlaylistIR,
// } from "./createMediaPlaylistIR";
// import guessMimeType from "./guess_mime_type";
// import { IXMedia } from "./parseEXTXMediaLine";
import parseVariant, { ICodecToGroupID } from "./parse_variant";
// import HLSRepresentationIndex from "./representation_index";

interface ILoadedResource {
  url?: string;
  sendingTime?: number;
  receivedTime?: number;
  responseData: string;
}

export type IParserResponse<T> =
  | {
      type: "needs-ressources";
      value: {
        ressources: string[];
        continue: (loadedRessources: ILoadedResource[]) => IParserResponse<T>;
      };
    }
  | { type: "done"; value: T };

export type IHLSPlaylistParserResponse = IParserResponse<IParsedManifest>;

export interface IPlaylistParserArgument {
  externalClockOffset?: number; // If set, offset to add to `performance.now()`
  // to obtain the current server's time
  manifestReceivedTime?: number; // Time, in terms of `performance.now` at
  // which this MPD was received.
  referenceDateTime?: number; // Default base time, in seconds
  url?: string; // URL of the manifest (post-redirection if one)
}

// const PROPERTIES_IN_COMMON_FOR_SAME_ADAPTATION : Array<keyof IXMedia> =
//   [ "name",
//     "language",
//     "assocLanguage",
//     "isTranscribingSpokenDialog",
//     "isDescribingMusicAndSound",
//     "isEasyToRead",
//     "isAudioDescription",
//     "channels" ];

export default function parseMasterPlaylist(
  playlist: string,
  args: IPlaylistParserArgument,
): IParserResponse<IParsedManifest> {
  const masterPlaylistIR = createMasterPlaylistIR(playlist);

  const baseURL = normalizeBaseURL(args.url ?? "");
  const everyRessources = masterPlaylistIR.variants
    .map((m) => m.defaultURI)
    .filter((uri) => uri !== undefined)
    .concat(masterPlaylistIR.medias.map((v) => v.uri).filter((uri) => uri !== undefined))
    .map((uri) => resolveURL(baseURL, uri));

  function continueParsing(
    loadedRessources: ILoadedResource[],
  ): IParserResponse<IParsedManifest> {
    let resourceI = 0;

    const mainRepresentations: IParsedRepresentation[] = [];

    // Store codec information from the Variant, to be used when parsing the
    // corresponding media
    const codecToGroupIDMap: ICodecToGroupID = {};

    for (let i = 0; i < masterPlaylistIR.variants.length; i++) {
      const variant = masterPlaylistIR.variants[i];

      const { url, responseData } = loadedRessources[resourceI];
      const representation = parseVariant(variant, {
        codecToGroupIDMap,
        requestData: responseData,
        requestURL: url,
        wantedID: `default-video-variant-${i}`,
      });
      if (representation !== null) {
        mainRepresentations.push(representation);
        resourceI++;
      }
    }

    const mainAdaptation: IParsedAdaptation = {
      id: "default-video-track",
      representations: mainRepresentations,
      type: "video" as const,
    };

    // // Store each Media both by group id and by type.
    // // The same media element will have the same reference in both objects,
    // // to link both objects more easily.
    // const mediasByGroupID : Partial<Record<string,
    //                                        Array<[ IXMedia,
    //                                                IMediaPlaylistIR ]>>> = {};
    // const mediasByType : Partial<Record<IParsedAdaptationType,
    //                                     Array<[ IXMedia,
    //                                             IMediaPlaylistIR ]>>> = {};

    // for (let i = 0; i < masterPlaylistIR.medias.length; i++) {
    //   const media = masterPlaylistIR.medias[i];
    //   if (media.uri !== undefined) {
    //     const { responseData } = loadedRessources[resourceI];
    //     const parsedMedia = createMediaPlaylistIR(responseData);

    //     const type : IParsedAdaptationType =
    //       media.mediaType === "closed-caption" ? "text" :
    //                                              media.mediaType;

    //     const dataToInsert : [ IXMedia, IMediaPlaylistIR ] = [
    //       media,
    //       parsedMedia,
    //     ];
    //     let mediasWithSameType = mediasByType[type];
    //     if (mediasWithSameType === undefined) {
    //       mediasWithSameType = [];
    //       mediasByType[type] = mediasWithSameType;
    //     }
    //     mediasWithSameType.push(dataToInsert);

    //     let mediaGroup = mediasByGroupID[media.groupId];
    //     if (mediaGroup === undefined) {
    //       mediaGroup = [];
    //       mediasByGroupID[media.groupId] = mediaGroup;
    //     }
    //     mediaGroup.push(dataToInsert);
    //     resourceI++;
    //   }
    // }

    // const adaptations : IParsedAdaptations = {};
    // const availableTypes = Object.keys(mediasByType);
    // for (let i = 0; i < availableTypes.length; i++) {
    //   const currentType = availableTypes[i] as IParsedAdaptationType;
    //   const mediasForType = mediasByType[currentType];
    //   if (mediasForType === undefined) {
    //     continue;
    //   }
    //   const adaptationsForCurrentType : IParsedAdaptation[] = [];
    //   adaptations[currentType] = adaptationsForCurrentType;

    //   for (let j = 0; j < mediasForType.length; j++) {
    //     const [media, mediaPlaylist] = mediasForType[j];
    //     const { url } = loadedRessources[j]; // XXX TODO
    //     const { endList,
    //             initSegment: initSegmentInfo,
    //             segments,
    //             mediaSequence } = mediaPlaylist;
    //     const isVoD = mediaPlaylist.playlistType === "VOD";
    //     const mediaPlaylistURL = url === undefined ?
    //       normalizeBaseURL(media.uri as string) :
    //       normalizeBaseURL(url);
    //     const index = new HLSRepresentationIndex({ endList,
    //                                                initSegmentInfo,
    //                                                isVoD,
    //                                                mediaPlaylistURL,
    //                                                mediaSequence,
    //                                                segments });
    //     const representations : IParsedRepresentation[] = [{
    //       bitrate: 1,
    //       id: `${currentType}-${media.name}-${j}`,
    //       index,
    //     }];
    //     const adaptation : IParsedAdaptation = {
    //       id: `${currentType}-${media.name}-{j}`,
    //       type: currentType,
    //       representations,
    //       audioDescription: media.isAudioDescription,
    //       closedCaption: media.isDescribingMusicAndSound,
    //       language: media.language,
    //     };
    //     adaptationsForCurrentType.push(adaptation);
    //     for (let k = j + 1; k < mediasForType.length; k++) {
    //       const comparedMedia = mediasForType[k][0];
    //       const haveAllSameProperties =
    //         PROPERTIES_IN_COMMON_FOR_SAME_ADAPTATION.every(prop => {
    //           return media[prop] === comparedMedia[prop];
    //         });
    //       if (haveAllSameProperties) {
    //         if (media.uri === undefined) {
    //           continue;
    //         }
    //         const parsed = mediasForType[k][1];
    //         const _isVoD = parsed.playlistType === "VOD";
    //         const _med = url === undefined ?
    //           normalizeBaseURL(media.uri) :
    //           normalizeBaseURL(url);
    //         const _index = new HLSRepresentationIndex({ endList,
    //                                                     initSegmentInfo,
    //                                                     isVoD: _isVoD,
    //                                                     mediaPlaylistURL: _med,
    //                                                     mediaSequence,
    //                                                     segments });
    //         representations.push({ bitrate: 1,
    //                                id: `${currentType}-${media.name}-${k}`,
    //                                index: _index });
    //       }
    //     }
    //   }
    // }

    const period: IParsedPeriod = {
      id: "period-0",
      start: 0,
      adaptations: { video: [mainAdaptation] },
    };

    const manifest: IParsedManifest = {
      isDynamic: false,
      isLive: false,
      periods: [period],
      transportType: "hls",
      availabilityStartTime: 0,
    };
    const minimumTime = getMinimumPosition(manifest);
    const maximumTime = getMaximumPosition(manifest);
    const now = performance.now();
    if (minimumTime !== undefined) {
      manifest.minimumTime = { isContinuous: false, value: minimumTime, time: now };
    }
    if (maximumTime !== undefined) {
      manifest.maximumTime = { isContinuous: false, value: maximumTime, time: now };
      manifest.periods[0].end = manifest.periods[0].duration = maximumTime;
    }
    return { type: "done", value: manifest };
  }

  return {
    type: "needs-ressources",
    value: { ressources: everyRessources, continue: continueParsing },
  };
}
