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

import objectAssign = require("object-assign");
import config from "../../../../config";
import arrayIncludes from "../../../../utils/array-includes";
import generateNewId from "../../../../utils/id";
import log from "../../../../utils/log";
import {
  normalizeBaseURL,
  resolveURL,
} from "../../../../utils/url";
import {
  parseDateTime,
  parseDuration,
} from "../helpers";
import {
  IParsedAdaptationSet,
} from "./AdaptationSet";
import parsePeriod, {
  IContentProtectionParser,
} from "./Period";

export interface IParsedMPD {
  // required
  availabilityStartTime : number;
  duration : number;
  id : string;
  periods : IPeriod[];
  transportType : string;
  type : string;
  uris : string[];

  // optional
  profiles? : string;
  availabilityEndTime? : number;
  publishTime? : number;
  minimumUpdatePeriod? : number;
  minBufferTime? : number;
  timeShiftBufferDepth? : number;
  suggestedPresentationDelay? : number;
  maxSegmentDuration? : number;
  maxSubsegmentDuration? : number;
  presentationLiveGap? : number;
}

export interface IPeriod {
  // required
  id : string;
  adaptations : IParsedAdaptationSet[];
  start : number;

  // optional
  duration? : number; // should only be for the last period
  bitstreamSwitching? : boolean;
}

/**
 * Returns "last time of reference" from the adaptation given, considering a
 * live content.
 * Undefined if a time could not be found.
 *
 * We consider the earliest last time from every representations in the given
 * adaptation.
 *
 * This is done to calculate a liveGap which is valid for the whole manifest,
 * even in weird ones.
 * @param {Object} adaptation
 * @returns {Number|undefined}
 */
const getLastLiveTimeReference = (adaptation: IParsedAdaptationSet): number|undefined => {
  // Here's how we do, for each possibility:
  //  1. only the adaptation has an index (no representation has):
  //    - returns the index last time reference
  //
  //  2. every representations have an index:
  //    - returns minimum for every representations
  //
  //  3. not all representations have an index but the adaptation has
  //    - returns minimum between all representations and the adaptation
  //
  //  4. no index for 1+ representation(s) and no adaptation index:
  //    - returns undefined
  //
  //  5. Invalid index found somewhere:
  //    - returns undefined

  if (!adaptation) {
    return undefined;
  }

  const representations = adaptation.representations || [];

  const lastLiveTimeReferences : Array<number|undefined> = representations
    .map(representation => {
      const lastPosition = representation.index.getLastPosition();
      return lastPosition != null ? lastPosition - 10 : undefined; // TODO
    });

  if (lastLiveTimeReferences.some((x) => x == null)) {
    return undefined;
  }

  const representationsMin = Math.min(...lastLiveTimeReferences as number[]);

  if (isNaN(representationsMin)) {
    return undefined;
  }
  return representationsMin;
};

/**
 * @param {Element} root
 * @param {string} uri - URI with which the manifest has been downloaded.
 * @param {Function} [contentProtectionParser]
 * @returns {Object}
 */
export default function parseMPD(
  root: Element,
  uri : string,
  contentProtectionParser?: IContentProtectionParser
) : IParsedMPD {
  let mpdRootURL = normalizeBaseURL(uri);

  const mpdURIs : string[] = [uri];
  const mpdPeriodNodes : Node[] = [];

  const mpdChildren = root.childNodes;
  for (let i = 0; i < mpdChildren.length; i++) {
    const currentNode = mpdChildren[i];
    switch (currentNode.nodeName) {

      case "BaseURL":
        mpdRootURL = resolveURL(mpdRootURL, currentNode.textContent || "");
        break;

      case "Location":
        mpdURIs.push(currentNode.textContent || "");
        break;

      case "Period":
        mpdPeriodNodes.push(currentNode);
        break;
    }
  }

  const parsedPeriods = mpdPeriodNodes
    .map(periodNode => {
      return parsePeriod(periodNode, mpdRootURL, contentProtectionParser);
    });

  let id : string|undefined;
  let profiles : string|undefined;
  let type : string|undefined;
  let availabilityStartTime : number|undefined;
  let availabilityEndTime : number|undefined;
  let publishTime : number|undefined;
  let duration : number|undefined;
  let minimumUpdatePeriod : number|undefined;
  let minBufferTime : number|undefined;
  let timeShiftBufferDepth : number|undefined;
  let suggestedPresentationDelay : number|undefined;
  let maxSegmentDuration : number|undefined;
  let maxSubsegmentDuration : number|undefined;

  for (let i = 0; i < root.attributes.length; i++) {
    const attribute = root.attributes[i];

    switch (attribute.name) {
      case "id":
        id = attribute.value;
        break;
      case "profiles":
        profiles = attribute.value;
        break;
      case "type":
        type = attribute.value;
        break;
      case "availabilityStartTime":
        availabilityStartTime = +parseDateTime(attribute.value);
        break;
      case "availabilityEndTime":
        availabilityEndTime = +parseDateTime(attribute.value);
        break;
      case "publishTime":
        publishTime = +parseDateTime(attribute.value);
        break;
      case "mediaPresentationDuration":
        duration = parseDuration(attribute.value);
        break;
      case "minimumUpdatePeriod":
        minimumUpdatePeriod = parseDuration(attribute.value);
        break;
      case "minBufferTime":
        minBufferTime = parseDuration(attribute.value);
        break;
      case "timeShiftBufferDepth":
        timeShiftBufferDepth = parseDuration(attribute.value);
        break;
      case "suggestedPresentationDelay":
        suggestedPresentationDelay = parseDuration(attribute.value);
        break;
      case "maxSegmentDuration":
        maxSegmentDuration = parseDuration(attribute.value);
        break;
      case "maxSubsegmentDuration":
        maxSubsegmentDuration = parseDuration(attribute.value);
        break;
    }
  }

  const periods : IPeriod[] = [];

  for (let i = 0; i < parsedPeriods.length; i++) {
    const parsedPeriod = parsedPeriods[i];

    let period : IPeriod;
    if (parsedPeriod.start != null) {
      // is TS dumb here? It is not some lines after so this is weird.
      period = parsedPeriod as IPeriod;
    } else {
      let start : number;
      if (i === 0) {
        start = availabilityStartTime == null ? 0 : availabilityStartTime;
      } else {
        const prevPeriod = periods[i - 1];
        if (prevPeriod.duration != null) {
          start = prevPeriod.start + prevPeriod.duration;
        } else {
          throw new Error("Not enough informations on the periods.");
        }
      }
      period = objectAssign(parsedPeriod, { start });
    }

    const nextPeriod = parsedPeriods[i + 1];
    if (period.duration == null && nextPeriod && nextPeriod.start != null) {
      period.duration = nextPeriod.start - period.start;
    }

    periods.push(period);
  }

  const parsedMPD : IParsedMPD = {
    availabilityStartTime: availabilityStartTime != null ?
      availabilityStartTime : 0,
    duration: duration == null ? Infinity : duration,
    id: id != null ? id : "gen-dash-manifest-" + generateNewId(),
    periods,
    transportType: "dash",
    type: type || "static",
    uris: mpdURIs,
    suggestedPresentationDelay: suggestedPresentationDelay != null ?
      suggestedPresentationDelay : config.DEFAULT_SUGGESTED_PRESENTATION_DELAY.DASH,
  };

  if (profiles != null) {
    parsedMPD.profiles = profiles;
  }
  if (availabilityEndTime != null) {
    parsedMPD.availabilityEndTime = availabilityEndTime;
  }
  if (publishTime != null) {
    parsedMPD.publishTime = publishTime;
  }
  if (duration != null) {
    parsedMPD.duration = duration;
  }
  if (minimumUpdatePeriod != null) {
    parsedMPD.minimumUpdatePeriod = minimumUpdatePeriod;
  }
  if (minBufferTime != null) {
    parsedMPD.minBufferTime = minBufferTime;
  }
  if (timeShiftBufferDepth != null) {
    parsedMPD.timeShiftBufferDepth = timeShiftBufferDepth;
  }
  if (maxSegmentDuration != null) {
    parsedMPD.maxSegmentDuration = maxSegmentDuration;
  }
  if (maxSubsegmentDuration != null) {
    parsedMPD.maxSubsegmentDuration = maxSubsegmentDuration;
  }

  if (parsedMPD.type === "dynamic") {
    const adaptations = parsedMPD.periods[
      parsedMPD.periods.length - 1
    ].adaptations;

    const videoAdaptation = adaptations
      .filter(a => a.type === "video")[0];

    const lastRef = getLastLiveTimeReference(videoAdaptation);
    parsedMPD.presentationLiveGap = lastRef != null ?
      Date.now() / 1000 - (lastRef + parsedMPD.availabilityStartTime) : 10;
  }

  checkManifestIDs(parsedMPD);
  return parsedMPD;
}

/**
 * Ensure that no two period have the same ID, than no two adaptations
 * neither for the same period and that no two representations from a same
 * adaptation neither.
 *
 * Log and mutate their ID if not until this is verified.
 *
 * @param {Object} manifest
 */
function checkManifestIDs(manifest : IParsedMPD) : void {
  const periodIDs : string[] = [];
  manifest.periods.forEach(period => {
    const periodID = period.id;
    if (arrayIncludes(periodIDs, periodID)) {
      log.warn("DASH: Two periods with the same ID found. Updating.",
        periodID);
      const newID =  periodID + "-";
      period.id = newID;
      checkManifestIDs(manifest);
      periodIDs.push(newID);
    } else {
      periodIDs.push(periodID);
    }
    const adaptationIDs : string[] = [];
    period.adaptations.forEach(adaptation => {
      const adaptationID = adaptation.id;
      if (arrayIncludes(adaptationIDs, adaptationID)) {
        log.warn("DASH: Two adaptations with the same ID found. Updating.",
          adaptationID);
        const newID =  adaptationID + "-";
        adaptation.id = newID;
        checkManifestIDs(manifest);
        adaptationIDs.push(newID);
      } else {
        adaptationIDs.push(adaptationID);
      }
      const representationIDs : string[] = [];
      adaptation.representations.forEach(representation => {
        const representationID = representation.id;
        if (arrayIncludes(representationIDs, representationID)) {
          log.warn("DASH: Two representations with the same ID found. Updating.",
            representationID);
          const newID =  representationID + "-";
          representation.id = newID;
          checkManifestIDs(manifest);
          representationIDs.push(newID);
        } else {
          representationIDs.push(representationID);
        }
      });
    });
  });
}

export { IContentProtectionParser };
