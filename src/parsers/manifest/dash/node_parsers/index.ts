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

import objectAssign from "object-assign";
import config from "../../../../config";
import generateNewId from "../../../../utils/id";
import {
  normalizeBaseURL,
  resolveURL,
} from "../../../../utils/url";
import { IParsedManifest } from "../../types";
import checkManifestIDs from "../../utils/check_manifest_ids";
import { getPeriodsFromIntermediate } from "../node_parsers/Period";
import { createMPDIntermediateRepresentation } from "./MPD";
import { IParsedDASHPeriod } from "./Period";

export interface IParsedDASHManifest extends IParsedManifest {
  periods: IParsedDASHPeriod[];
}

export default function parseManifest(
  root: Element,
  uri : string
) : IParsedDASHManifest {
  // Transform whole MPD into a parsed JS object representation
  const {
    children: rootChildren,
    attributes: rootAttributes,
  } = createMPDIntermediateRepresentation(root);

  const mpdRootURL = resolveURL(normalizeBaseURL(uri), rootChildren.baseURL);

  const parsedPeriods = getPeriodsFromIntermediate(
    rootChildren.periods,
    objectAssign(rootAttributes, { mpdRootURL })
  );

  const isLive : boolean = rootAttributes.type === "dynamic";
  const duration : number = (() => {
    if (rootAttributes.duration != null) {
      return rootAttributes.duration;
    }
    if (isLive) {
      return Infinity;
    }
    if (parsedPeriods.length) {
      const lastPeriod = parsedPeriods[parsedPeriods.length - 1];
      if (lastPeriod.end != null) {
        return lastPeriod.end;
      } else if (lastPeriod.duration != null) {
        return lastPeriod.start + lastPeriod.duration;
      }
    }
    return Infinity;
  })();

  const parsedMPD : IParsedDASHManifest = {
    availabilityStartTime: (
        rootAttributes.type === "static" ||
        rootAttributes.availabilityStartTime == null
      ) ?  0 : rootAttributes.availabilityStartTime,
    duration,
    id: rootAttributes.id != null ?
      rootAttributes.id : "gen-dash-manifest-" + generateNewId(),
    periods: parsedPeriods,
    transportType: "dash",
    isLive,
    uris: [uri, ...rootChildren.locations],
    suggestedPresentationDelay: rootAttributes.suggestedPresentationDelay != null ?
      rootAttributes.suggestedPresentationDelay :
      config.DEFAULT_SUGGESTED_PRESENTATION_DELAY.DASH,
  };

  // -- add optional fields --

  if (rootAttributes.profiles != null) {
    parsedMPD.profiles = rootAttributes.profiles;
  }
  if (rootAttributes.type !== "static" && rootAttributes.availabilityEndTime != null) {
    parsedMPD.availabilityEndTime = rootAttributes.availabilityEndTime;
  }
  if (rootAttributes.publishTime != null) {
    parsedMPD.publishTime = rootAttributes.publishTime;
  }
  if (rootAttributes.duration != null) {
    parsedMPD.duration = rootAttributes.duration;
  }
  if (rootAttributes.minBufferTime != null) {
    parsedMPD.minBufferTime = rootAttributes.minBufferTime;
  }
  if (rootAttributes.timeShiftBufferDepth != null) {
    parsedMPD.timeShiftBufferDepth = rootAttributes.timeShiftBufferDepth;
  }
  if (rootAttributes.maxSegmentDuration != null) {
    parsedMPD.maxSegmentDuration = rootAttributes.maxSegmentDuration;
  }
  if (rootAttributes.maxSubsegmentDuration != null) {
    parsedMPD.maxSubsegmentDuration = rootAttributes.maxSubsegmentDuration;
  }

  checkManifestIDs(parsedMPD);
  return parsedMPD;
}
