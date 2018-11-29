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
  normalizeBaseURL,
  resolveURL,
} from "../../../utils/url";
import { IParsedManifest } from "../types";
import checkManifestIDs from "../utils/check_manifest_ids";
import getPresentationLiveGap from "./get_presentation_live_gap";
import { createMPDIntermediateRepresentation } from "./node_parsers/MPD";
import parsePeriods from "./parsePeriods";

/**
 * @param {Element} root - The MPD root.
 * @param {string} url - The url where the MPD is located
 * @returns {Object}
 */
export default function parseMPD(
  root : Element,
  uri : string
) : IParsedManifest {
  // Transform whole MPD into a parsed JS object representation
  const {
    children: rootChildren,
    attributes: rootAttributes,
  } = createMPDIntermediateRepresentation(root);

  const baseURL = resolveURL(normalizeBaseURL(uri), rootChildren.baseURL);

  const isDynamic : boolean = rootAttributes.type === "dynamic";
  const availabilityStartTime = (
    rootAttributes.type === "static" ||
    rootAttributes.availabilityStartTime == null
  ) ?  0 : rootAttributes.availabilityStartTime;
  const parsedPeriods = parsePeriods(rootChildren.periods, {
    availabilityStartTime,
    duration: rootAttributes.duration,
    isDynamic,
    baseURL,
  });

  const duration : number = (() => {
    if (rootAttributes.duration != null) {
      return rootAttributes.duration;
    }
    if (isDynamic) {
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

  const parsedMPD : IParsedManifest = {
    availabilityStartTime,
    baseURL,
    duration,
    id: rootAttributes.id != null ?
      rootAttributes.id : "gen-dash-manifest-" + generateNewId(),
    periods: parsedPeriods,
    transportType: "dash",
    isLive: isDynamic,
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
  if (parsedMPD.isLive) {
    parsedMPD.presentationLiveGap = getPresentationLiveGap(parsedMPD);
  }
  return parsedMPD;
}
