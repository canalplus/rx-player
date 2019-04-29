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
  IAdaptationType,
  StaticRepresentationIndex,
  SUPPORTED_ADAPTATIONS_TYPE,
} from "../../../manifest";
import idGenerator from "../../../utils/id_generator";
import {
  IParsedAdaptation,
  IParsedAdaptations,
  IParsedManifest,
  IParsedPeriod,
} from "../types";
import MetaRepresentationIndex from "./representation_index";

export type IAdaptationType = "video"|"audio"|"text"|"image";

export type IParserResponse<T> =
  {
    type : "needs-manifest-loader";
    value : {
      ressources : Array<{ url : string; transportType : string }>;
      continue : (loadedRessources : Manifest[]) => IParserResponse<T>;
    };
  } |
  { type : "done"; value : T };

export interface IMetaPlaylistTextTrack {
  url : string;
  language : string;
  closedCaption : boolean;
  mimeType : string;
  codecs? : string;
}

export interface IMetaPlaylist {
  type : "MPL";
  version : string;
  dynamic? : boolean;
  pollInterval? : number;
  contents: Array<{
    url: string;
    startTime: number;
    endTime: number;
    transport: string;
    textTracks?: IMetaPlaylistTextTrack[];
  }>;
}

const generateManifestID = idGenerator();

/**
 * Parse playlist string to JSON.
 * Returns an array of contents.
 * @param {string} data
 * @param {string} url
 * @returns {Object}
 */
export default function parseMetaPlaylist(
  data : unknown,
  url? : string
): IParserResponse<IParsedManifest> {
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

  const { contents, version, type } = parsedData;

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
  const ressources : Array<{ url : string; transportType : string }> = [];
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
    ressources.push({ url: content.url, transportType: content.transport });
  }

  const metaPlaylist : IMetaPlaylist = parsedData;
  return {
    type : "needs-manifest-loader",
    value : {
      ressources,
      continue : function parseWholeMPL(loadedRessources : Manifest[]) {
        const parsedManifest = createManifest(metaPlaylist, loadedRessources, url);
        return { type: "done", value: parsedManifest };
      },
    },
  };
}

/**
 * From several parsed manifests, generate a single bigger manifest.
 * Each content presents a start and end time, so that periods
 * boudaries could be adapted.
 * @param {Object} mplData
 * @param {Array<Object>} manifest
 * @param {string} url
 * @returns {Object}
 */
function createManifest(
  mplData : IMetaPlaylist,
  manifests : Manifest[],
  url? : string
): IParsedManifest {
  const generateAdaptationID = idGenerator();
  const generateRepresentationID = idGenerator();
  const { contents } = mplData;
  const minimumTime = contents.length ? contents[0].startTime :
                                        0;
  const maximumTime = contents.length ? contents[contents.length - 1].endTime :
                                        0;
  const isDynamic = mplData.dynamic === true;
  let duration : number|undefined = 0;

  const periods : IParsedPeriod[] = [];
  for (let iMan = 0; iMan < contents.length; iMan++) {
    const content = contents[iMan];
    const currentManifest = manifests[iMan];
    if (currentManifest.periods.length <= 0) {
      continue;
    }
    const contentOffset = content.startTime - currentManifest.periods[0].start;
    const contentEnd = content.endTime;

    const manifestPeriods = [];
    for (let iPer = 0; iPer < currentManifest.periods.length; iPer++) {
      const currentPeriod = currentManifest.periods[iPer];
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

              const contentInfos = {
                manifest: currentManifest,
                period: currentPeriod,
                adaptation: currentAdaptation,
                representation: currentRepresentation,
              };

              const newIndex = new MetaRepresentationIndex(currentRepresentation.index,
                                                           [contentOffset, contentEnd],
                                                           content.transport,
                                                           contentInfos);
              representations.push({
                bitrate: currentRepresentation.bitrate,
                index: newIndex,
                id: currentRepresentation.id,
                height: currentRepresentation.height,
                width: currentRepresentation.width,
                mimeType: currentRepresentation.mimeType,
                frameRate: currentRepresentation.frameRate,
                codecs: currentRepresentation.codec,
                contentProtections: currentRepresentation.contentProtections,
              });
            }
            adaptationsForCurrentType.push({
              id: currentAdaptation.id,
              representations,
              type: currentAdaptation.type,
              audioDescription: currentAdaptation.isAudioDescription,
              closedCaption: currentAdaptation.isClosedCaption,
              language: currentAdaptation.language,
            });
            acc[type] = adaptationsForCurrentType;
          }
          return acc;
        }, {});

      // TODO only first period?
      const textTracks : IMetaPlaylistTextTrack[] = content.textTracks || [];
      const newTextAdaptations : IParsedAdaptation[] = textTracks.map((track) => {
        const adaptationID = "gen-text-ada-" + generateAdaptationID();
        const representationID = "gen-text-rep-" + generateRepresentationID();
        return {
          id: adaptationID,
          type: "text",
          language: track.language,
          closedCaption: track.closedCaption,
          manuallyAdded: true,
          representations: [
            { bitrate: 0,
              id: representationID,
              mimeType: track.mimeType,
              codecs: track.codecs,
              index: new StaticRepresentationIndex({ media: track.url }),
            },
          ],
        };
      }, []);

      if (newTextAdaptations.length > 0) {
        if (adaptations.text == null) {
          adaptations.text = newTextAdaptations;
        } else {
          adaptations.text.push(...newTextAdaptations);
        }
      }

      const newPeriod : IParsedPeriod = {
        id: formatId(currentManifest.id) + "_" + formatId(currentPeriod.id),
        adaptations,
        duration: currentPeriod.duration,
        start: contentOffset + currentPeriod.start,
      };
      manifestPeriods.push(newPeriod);
    }

    for (let i = manifestPeriods.length - 1; i >= 0; i--) {
      const period = manifestPeriods[i];
      if (period.start >= content.endTime) {
        manifestPeriods.splice(i, 1);
      } else if (period.duration != null) {
        if (period.start + period.duration > content.endTime) {
          period.duration = content.endTime - period.start;
        }
      } else if (i === manifestPeriods.length - 1) {
        period.duration = content.endTime - period.start;
      }
    }
    periods.push(...manifestPeriods);

    if (!isDynamic && duration != null) {
      const currentDuration = currentManifest.getDuration();
      if (currentDuration == null) {
        duration = undefined;
      } else {
        duration += currentDuration;
      }
    }
  }

  const time = performance.now();
  const manifest = {
    availabilityStartTime: 0,
    suggestedPresentationDelay: 10,
    duration: isDynamic ? undefined : duration,
    id: "gen-metaplaylist-man-" + generateManifestID(),
    periods,
    transportType: "metaplaylist",
    isLive: isDynamic,
    isDynamic,
    uris: url == null ? [] :
                        [url],
    maximumTime: { isContinuous: false, value: maximumTime, time },
    minimumTime: { isContinuous: false, value: minimumTime, time },
    lifetime: mplData.pollInterval,
  };

  return manifest;
}

function formatId(str : string) {
  return str.replace(/_/g, "\_");
}
