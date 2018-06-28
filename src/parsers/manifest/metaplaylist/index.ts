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

import config from "../../../config";
import Manifest, {
  Adaptation,
  IManifestArguments,
} from "../../../manifest";
import { SUPPORTED_ADAPTATIONS_TYPE } from "../../../manifest/adaptation";
import { StaticRepresentationIndex } from "../../../manifest/representation_index";
import generateNewId from "../../../utils/id";
import {
  IParsedManifest,
  IParsedPeriod,
} from "../types";
import MetaRepresentationIndex from "./representaton_index";

export type AdaptationType = "video"|"audio"|"text"|"image";

const { DEFAULT_LIVE_GAP } = config;

/**
 * From several parsed manifests, generate a single manifest
 * which fakes live content playback.
 * Each content presents a start and end time, so that periods
 * boudaries could be adapted.
 * @param {Object} contents
 * @param {string} baseURL
 */
export default function parseMetaManifest(
  contents: Array<{
      manifest: IParsedManifest;
      url: string;
      transport: "dash"|"smooth";
      startTime: number;
      endTime: number;
      textTracks: Array<{
        url: string;
        language: string;
        mimeType: string;
      }>;
  }>,
  attributes: {
    timeShiftBufferDepth: number;
  },
  baseURL: string
): IParsedManifest {

  const parsedPeriods = contents
    .map((content) => content.manifest.periods[0]);

  // Build manifest root attributes
  const presentationLiveGap =
  (contents.map(content => content.manifest.presentationLiveGap)
    .reduce((acc, val) =>
      Math.min(acc || DEFAULT_LIVE_GAP, val || DEFAULT_LIVE_GAP), DEFAULT_LIVE_GAP
    )) || DEFAULT_LIVE_GAP;

  const suggestedPresentationDelay =
    (contents.map(content => content.manifest.suggestedPresentationDelay)
      .reduce((acc, val) => Math.min(acc || 10, val || 10), 10)) || 10;

  const maxSegmentDuration =
    contents.map(content => content.manifest.maxSegmentDuration)
      .reduce((acc, val) => Math.min((acc || 0), (val || 0)), 0);

  const minBufferTime =
    contents.map(content => content.manifest.minBufferTime)
      .reduce((acc, val) => Math.min((acc || 0), (val || 0)), 0);

  // Build new period array
  const newPeriods: IParsedPeriod[] = [];
  const contentEnding = contents[contents.length - 1].endTime;

  for (let j = 0; j < parsedPeriods.length; j++) {
    const baseManifest = new Manifest(contents[j].manifest as IManifestArguments);
    const parsedPeriod = parsedPeriods[j];
    parsedPeriod.start = contents[j].startTime;
    parsedPeriod.end =
      contents[j].endTime || (parsedPeriod.start + (parsedPeriod.duration || 0));
    parsedPeriod.duration = parsedPeriod.end - parsedPeriod.start;

    const textTracks = contents[j].textTracks;
    if (textTracks && textTracks.length > 0) {
      textTracks.forEach((track) => {
        const textAdaptation = {
          id: "gen-text-ada-" + generateNewId(),
          representations: [{
            mimeType: track.mimeType,
            bitrate: 0,
            index: new StaticRepresentationIndex({
              media: track.url,
              startTime: 0,
              endTime: parsedPeriod.duration || Number.MAX_VALUE,
            }),
            id: "gen-text-rep-" + generateNewId(),
          }],
          type: "text",
          normalizedLanguage: track.language,
        };
        if (!parsedPeriod.adaptations.text) {
          parsedPeriod.adaptations.text = [];
        }
        parsedPeriod.adaptations.text.push(textAdaptation);
      });
    }

    const adaptations = parsedPeriod.adaptations;
    SUPPORTED_ADAPTATIONS_TYPE.forEach((adaptationType) => {
      const adaptationsByType = adaptations[adaptationType];
      if (adaptationsByType) {
        adaptationsByType.forEach((adaptation) => {
          const representations = adaptation.representations;
          representations.forEach((representation) => {
            const index = representation.index;

            // Store base contents info
            const baseAdaptation = ["audio", "video", "image", "text"]
              .reduce((acc: Adaptation[], type) => {
                const _adaptation = baseManifest.adaptations[type as AdaptationType];
                if (_adaptation) {
                  return acc.concat(_adaptation);
                }
                return acc;
              }, []).find((a: Adaptation) => a.id === adaptation.id);
            const baseRepresentation =
              baseAdaptation ?
                baseAdaptation.representations.find((r) => r.id === representation.id) :
                undefined;
            const basePeriod =
              baseManifest.periods.find((p) => p.id === parsedPeriod.id);
            const baseContentInfos = {
              manifest: baseManifest,
              period: basePeriod,
              adaptation: baseAdaptation,
              representation: baseRepresentation,
            };

            const newIndex = new MetaRepresentationIndex(
              index,
              parsedPeriod.start,
              contents[j].transport,
              contentEnding,
              baseContentInfos
            );
            representation.index = newIndex;
          });
        });
      }
    });

    newPeriods.push(parsedPeriod);
  }

  const manifest = {
    availabilityStartTime: 0,
    presentationLiveGap,
    timeShiftBufferDepth: attributes.timeShiftBufferDepth,
    duration: Infinity,
    id: "gen-metaplaylist-man-" + generateNewId(),
    maxSegmentDuration,
    minBufferTime,
    periods: newPeriods,
    suggestedPresentationDelay,
    transportType: "metaplaylist",
    type: "dynamic",
    uris: [baseURL],
  };

  return manifest;
}
