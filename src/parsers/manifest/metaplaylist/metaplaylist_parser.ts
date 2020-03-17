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
  // StaticRepresentationIndex,
  IAdaptationType,
  LoadedPeriod,
  PartialPeriod,
  SUPPORTED_ADAPTATIONS_TYPE,
} from "../../../manifest";
import {
  IParsedAdaptation,
  IParsedAdaptations,
  IParsedManifest,
  IParsedPartialPeriod,
  IParsedPeriod,
} from "../types";
import MetaRepresentationIndex from "./representation_index";

export type IParserResponse<T> =
  { type : "needs-manifest-loader";
    value : {
      ressources : Array<{ url : string; transportType : string }>;
      continue : (loadedRessources : Manifest[]) => IParserResponse<T>;
    }; } |
  { type : "done"; value : T };

export interface IMetaPlaylistTextTrack {
  url : string;
  language : string;
  closedCaption : boolean;
  mimeType : string;
  codecs? : string;
}

export interface IMetaPlaylist {
  type : "MPL"; // Obligatory token
  version : string; // MAJOR.MINOR
  dynamic? : boolean; // The MetaPlaylist could need to be updated
  pollInterval? : number; // Refresh interval in seconds
  contents: Array<{ // Sub-Manifests
    url: string; // URL of the Manifest
    startTime: number; // start timestamp in seconds
    endTime: number; // end timestamp in seconds
    transport: string; // "dash" | "smooth" | "metaplaylist"
    textTracks?: IMetaPlaylistTextTrack[];
  }>;
}

/**
 * Parse playlist string to JSON.
 * Returns an array of contents.
 * @param {string} data
 * @param {string} url
 * @returns {Object}
 */
export default function parseMetaPlaylist(
  data : unknown,
  parserOptions : { url?: string;
                    serverSyncInfos?: { serverTimestamp: number;
                                        clientTime: number; }; }
) : IParsedManifest {
  let parsedData;
  if (typeof data === "object" && data != null) {
    parsedData = data;
  } else if (typeof data === "string") {
    try {
      parsedData = JSON.parse(data);
    } catch (error) {
      throw new Error("MPL Parser: Bad MetaPlaylist file. Expected JSON.");
    }
  } else {
    throw new Error("MPL Parser: Parser input must be either a string " +
                    "or the MetaPlaylist data directly.");
  }

  const mplData = parsedData as IMetaPlaylist;
  const { version, contents, type } = mplData;

  if (type !== "MPL") {
    throw new Error("MPL Parser: Bad MetaPlaylist. " +
                    "The `type` property is not set to `MPL`");
  }

  if (version !== "0.1") {
    throw new Error("MPL Parser: Bad MetaPlaylist version");
  }

  // quick checks
  if (contents == null || contents.length === 0) {
    throw new Error("MPL Parser: No content found.");
  }
  const isDynamic = mplData.dynamic === true;
  const minimumTime = contents.length > 0 ? contents[0].startTime :
                                            0;
  const maximumTime = contents.length > 0 ? contents[contents.length - 1].endTime :
                                            0;
  const { url, serverSyncInfos } = parserOptions;
  const clockOffset = serverSyncInfos !== undefined ?
    serverSyncInfos.serverTimestamp - serverSyncInfos.clientTime :
    undefined;

  const partialPeriods : IParsedPartialPeriod[] = [];
  for (let i = 0; i < contents.length; i++) {
    const content = contents[i];
    if (
      content.url == null ||
      content.startTime == null ||
      content.endTime == null ||
      content.transport == null
    ) {
      throw new Error("MPL Parser: Malformed content.");
    }
    partialPeriods.push({ isLoaded: false,
                          id: `${content.startTime}-${content.url}`,
                          url: content.url,
                          start: content.startTime,
                          end: content.endTime,
                          duration: content.endTime - content.startTime,
                          privateInfos: {
                            metaplaylist: { transportType: content.transport },
                          } });
  }

  const time = performance.now();
  const manifest = { availabilityStartTime: 0,
                     clockOffset,
                     suggestedPresentationDelay: 10,
                     periods: partialPeriods,
                     transportType: "metaplaylist",
                     isLive: isDynamic,
                     isDynamic,
                     uris: url == null ? [] :
                                         [url],
                     maximumTime: { isContinuous: false,
                                    value: maximumTime,
                                    time },
                     minimumTime: { isContinuous: false,
                                    value: minimumTime,
                                    time },
                     lifetime: mplData.pollInterval };

  return manifest;
}

export function transformManifestToMetaplaylistPeriod(
  basePeriod : LoadedPeriod | PartialPeriod,
  manifestToTransform : Manifest
) : Array<IParsedPartialPeriod | IParsedPeriod > {
  if (manifestToTransform.periods.length <= 0) {
    return [];
  }
  if (basePeriod.privateInfos?.metaplaylist === undefined) {
    throw new Error("A MetaPlaylist Period should have the corresponding privateInfos.");
  }
  const transportType = basePeriod.privateInfos.metaplaylist.transportType;
  const contentOffset = basePeriod.start - manifestToTransform.periods[0].start;
  const contentEnd = basePeriod.end;

  const parsedPeriods = [];
  for (let iPer = 0; iPer < manifestToTransform.periods.length; iPer++) {
    const currentPeriod = manifestToTransform.periods[iPer];
    // XXX TODO
    if (!currentPeriod.isLoaded) {
      throw new Error();
    }
    const adaptations = SUPPORTED_ADAPTATIONS_TYPE
      .reduce<IParsedAdaptations>((acc, type : IAdaptationType) => {
        const currentAdaptations = currentPeriod.adaptations[type];
        if (currentAdaptations == null) {
          return acc;
        }

        const adaptationsForCurrentType : IParsedAdaptation[] = [];
        for (let iAda = 0; iAda < currentAdaptations.length; iAda++) {
          const currentAdaptation = currentAdaptations[iAda];

          const representations : any[] = [];
          for (let iRep = 0; iRep < currentAdaptation.representations.length; iRep++) {
            const currentRepresentation = currentAdaptation.representations[iRep];

            const contentInfos = { manifest: manifestToTransform,
                                   period: currentPeriod,
                                   adaptation: currentAdaptation,
                                   representation: currentRepresentation };

            const newIndex = new MetaRepresentationIndex(currentRepresentation.index,
                                                         [contentOffset, contentEnd],
                                                         transportType,
                                                         contentInfos);
            representations.push({ bitrate: currentRepresentation.bitrate,
                                   index: newIndex,
                                   id: currentRepresentation.id,
                                   height: currentRepresentation.height,
                                   width: currentRepresentation.width,
                                   mimeType: currentRepresentation.mimeType,
                                   frameRate: currentRepresentation.frameRate,
                                   codecs: currentRepresentation.codec,
                                   contentProtections: currentRepresentation
                                                         .contentProtections });
          }
          adaptationsForCurrentType.push({ id: currentAdaptation.id,
                                           representations,
                                           type: currentAdaptation.type,
                                           audioDescription: currentAdaptation
                                                               .isAudioDescription,
                                           closedCaption: currentAdaptation
                                                            .isClosedCaption,
                                           isDub: currentAdaptation.isDub,
                                           isSignInterpreted: currentAdaptation
                                             .isSignInterpreted,
                                           language: currentAdaptation.language, });
          acc[type] = adaptationsForCurrentType;
        }
        return acc;
      }, {});

    // XXX TODO
    // // TODO only first period?
    // const textTracks : IMetaPlaylistTextTrack[] =
    //   content.textTracks === undefined ? [] :
    //                                      content.textTracks;
    // const newTextAdaptations : IParsedAdaptation[] = textTracks.map((track) => {
    //   const adaptationID = "gen-text-ada-" + generateAdaptationID();
    //   const representationID = "gen-text-rep-" + generateRepresentationID();
    //   return {
    //     id: adaptationID,
    //     type: "text",
    //     language: track.language,
    //     closedCaption: track.closedCaption,
    //     manuallyAdded: true,
    //     representations: [
    //       { bitrate: 0,
    //         id: representationID,
    //         mimeType: track.mimeType,
    //         codecs: track.codecs,
    //         index: new StaticRepresentationIndex({ media: track.url }),
    //       },
    //     ],
    //   };
    // }, []);

    // if (newTextAdaptations.length > 0) {
    //   if (adaptations.text == null) {
    //     adaptations.text = newTextAdaptations;
    //   } else {
    //     adaptations.text.push(...newTextAdaptations);
    //   }
    // }

    const newPeriod : IParsedPeriod = { id: formatId(manifestToTransform.id) +
                                              "_" +
                                              formatId(currentPeriod.id),
                                        isLoaded: true,
                                        partialPeriodId: basePeriod.id,
                                        url: null,
                                        adaptations,
                                        duration: currentPeriod.duration,
                                        start: contentOffset + currentPeriod.start };
    parsedPeriods.push(newPeriod);
  }

  if (basePeriod.end !== undefined) {
    for (let i = parsedPeriods.length - 1; i >= 0; i--) {
      const period = parsedPeriods[i];
      if (period.start >= basePeriod.end) {
        parsedPeriods.splice(i, 1);
      } if (period.duration !== undefined) {
        if (period.start + period.duration > basePeriod.end) {
          period.duration = basePeriod.end - period.start;
        }
      } else if (i === parsedPeriods.length - 1) {
        period.duration = basePeriod.end - period.start;
      }
    }
  }
  return parsedPeriods;
}

function formatId(str : string) {
  return str.replace(/_/g, "\_");
}
