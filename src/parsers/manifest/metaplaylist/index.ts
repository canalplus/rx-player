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
import generateNewId from "../../../utils/id";
import {
  IParsedManifest,
  IParsedPeriod,
} from "../types";
import MetaRepresentationIndex from "./representation_index";

const { DEFAULT_LIVE_GAP } = config;

/**
 * From several parsed manifests, generate a single manifest
 * which fakes live content playback.
 * Each content presents a start and end time, so that periods
 * boudaries could be adapted.
 * @param {Object} contents
 * @param {string} baseURL
 */
export function generateManifest(
  contents: Array<{
      manifest: IParsedManifest;
      url: string;
      transport: "dash"|"smooth";
      startTime: number;
      endTime: number;
  }>,
  baseURL?: string
): IParsedManifest {

  // 1 - Get period durations
  const parsedPeriodsMyManifest = contents
    .map((content) => content.manifest.periods);
  const parsedPeriods = parsedPeriodsMyManifest
    .reduce((acc, periods) => acc.concat(periods), []);
  const durations : number[]
    = parsedPeriods.map((period: IParsedPeriod) => period.duration || 0);

  // 2 - Build manifest live data
  const presentationLiveGap =
    (contents.map(content => content.manifest.presentationLiveGap)
      .reduce((acc, val) =>
        Math.min(acc || DEFAULT_LIVE_GAP, val ||DEFAULT_LIVE_GAP), DEFAULT_LIVE_GAP
      )) || DEFAULT_LIVE_GAP;

  const suggestedPresentationDelay =
    (contents.map(content => content.manifest.suggestedPresentationDelay)
      .reduce((acc, val) => Math.min(acc || 10, val || 10), 10)) || 10;

  const maxSegmentDuration =
    contents.map(content => content.manifest.maxSegmentDuration)
      .reduce((acc, val) => Math.min((acc || 0),(val || 0)), 0);

  const minBufferTime =
    contents.map(content => content.manifest.minBufferTime)
      .reduce((acc, val) => Math.min((acc || 0),(val || 0)), 0);

  const timeShiftBufferDepth =
    durations.map(duration => duration)
      .reduce((acc, val) => Math.max((acc || 20),(val || 20)), 20);

  // 3 - Build new periods array
  const newPeriods: Array<{
    periods: IParsedPeriod[];
    transport: "dash"|"smooth";
  }> = [];

  for(let j = 0; j < durations.length; j++) {
    const _newPeriods = parsedPeriodsMyManifest[j];
    for(let m = 0; m < _newPeriods.length; m++) {
      let elapsedTimeOnLoop = 0;
      const periods: IParsedPeriod[] = [];
      const newPeriod = _newPeriods[m];
      newPeriod.start = contents[j].startTime + elapsedTimeOnLoop;
      elapsedTimeOnLoop += newPeriod.duration || 0;
      newPeriod.end = newPeriod.start + (newPeriod.duration || 0);
      newPeriod.id = "p" + Math.round(newPeriod.start);
      periods.push(newPeriod);
      newPeriods.push({periods, transport: contents[j].transport});
    }
  }

  // 4 - Generate final periods and wrap indexes.
  const contentEnding = contents[contents.length - 1].endTime;
  const finalPeriods = newPeriods
    .map((a) => {
      return a.periods.map((period) => {
        return { period, transport: a.transport };
      });
    })
    .reduce((acc, periods) => acc.concat(periods), [])
    .map(({ period, transport }) => {
      const adaptations = period.adaptations;
      adaptations.forEach((adaptation) => {
        const representations = adaptation.representations;
        representations.forEach((representation) => {
          const index = representation.index;
          const newIndex = new MetaRepresentationIndex(
            index, period.start, transport, contentEnding);
          representation.index = newIndex;
        });
      });
      return period;
    });

  const manifest = {
    availabilityStartTime: 0,
    presentationLiveGap,
    timeShiftBufferDepth,
    duration: Infinity,
    id: "gen-metaplaylist-man-"+generateNewId(),
    maxSegmentDuration,
    minBufferTime,
    periods: finalPeriods,
    suggestedPresentationDelay,
    transportType: "metaplaylist",
    type: "dynamic",
    uris: [baseURL || ""],
  };

  return manifest;
}
