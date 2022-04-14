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

import config from "../../../../config";
import log from "../../../../log";
import Manifest from "../../../../manifest";
import arrayFind from "../../../../utils/array_find";
import { normalizeBaseURL } from "../../../../utils/resolve_url";
import { IParsedManifest } from "../../types";
import {
  IMPDIntermediateRepresentation,
  IPeriodIntermediateRepresentation,
} from "../node_parser_types";
import { IResponseData } from "../parsers_types";
// eslint-disable-next-line max-len
import getClockOffset from "./get_clock_offset";
import getHTTPUTCTimingURL from "./get_http_utc-timing_url";
import getMinimumAndMaximumPositions from "./get_minimum_and_maximum_positions";
import parseAvailabilityStartTime from "./parse_availability_start_time";
import parsePeriods, {
  IXLinkInfos,
} from "./parse_periods";
import resolveBaseURLs, {
  IResolvedBaseUrl,
} from "./resolve_base_urls";


/** Possible options for `parseMPD`.  */
export interface IMPDParserArguments {
  /**
   * If set, offset to add to `performance.now()` to obtain the current server's
   * time.
   */
  externalClockOffset? : number | undefined;
  /** Time, in terms of `performance.now` at which this MPD was received. */
  manifestReceivedTime? : number | undefined;
  /** Default base time, in seconds. */
  referenceDateTime? : number | undefined;
  /**
   * The parser should take this Manifest - which is a previously parsed
   * Manifest for the same dynamic content - as a base to speed-up the parsing
   * process.
   * /!\ If unexpected differences exist between the two, there is a risk of
   * de-synchronization with what is actually on the server,
   * Use with moderation.
   */
  unsafelyBaseOnPreviousManifest : Manifest | null;
  /** URL of the manifest (post-redirection if one). */
  url? : string | undefined;
}

export interface ILoadedXlinkData {
  url? : string | undefined;
  sendingTime? : number | undefined;
  receivedTime? : number | undefined;
  parsed : IPeriodIntermediateRepresentation[];
  warnings : Error[];
}

/**
 * Return value returned from `parseMpdIr` when a "clock" needs to be fetched
 * before the true parsing can start.
 */
export interface IIrParserResponseNeedsClock {
  /** Identify this particular response. */
  type : "needs-clock";
  value : {
    /** URL allowing to fetch the clock data. */
    url : string;
    /**
     * Callback to call with the fetched clock data in argument to continue
     * parsing the MPD.
     */
    continue : (clockValue : IResponseData<string>) => IIrParserResponse;
  };
}

/**
 * Return value returned from `parseMpdIr` when XLinks needs to be loaded and
 * pre-parsed before the true parsing can start.
 */
export interface IIrParserResponseNeedsXlinks {
  type : "needs-xlinks";
  value : {
    xlinksUrls : string[];
    continue : (periods : ILoadedXlinkData[]) => IIrParserResponse;
  };
}

export interface IIrParserResponseDone {
  type : "done";
  value : {
    parsed : IParsedManifest;
    warnings : Error[];
  };
}

export type IIrParserResponse = IIrParserResponseNeedsClock |
                                IIrParserResponseNeedsXlinks |
                                IIrParserResponseDone;

/**
 * Checks if xlinks needs to be loaded before actually parsing the manifest.
 * @param {Object} mpdIR
 * @param {Object} args
 * @param {boolean} hasLoadedClock
 * @param {Array.<Object>} warnings
 * @returns {Object}
 */
export default function parseMpdIr(
  mpdIR : IMPDIntermediateRepresentation,
  args : IMPDParserArguments,
  warnings : Error[],
  hasLoadedClock? : boolean | undefined,
  xlinkInfos : IXLinkInfos = new WeakMap()
) : IIrParserResponse {
  const { children: rootChildren,
          attributes: rootAttributes } = mpdIR;
  if (args.externalClockOffset == null) {
    const isDynamic : boolean = rootAttributes.type === "dynamic";

    const directTiming = arrayFind(rootChildren.utcTimings, (utcTiming) => {
      return utcTiming.schemeIdUri === "urn:mpeg:dash:utc:direct:2014" &&
             utcTiming.value != null;
    });

    const clockOffsetFromDirectUTCTiming =
      directTiming != null &&
      directTiming.value != null ? getClockOffset(directTiming.value) :
                                   undefined;
    const clockOffset = clockOffsetFromDirectUTCTiming != null &&
                        !isNaN(clockOffsetFromDirectUTCTiming) ?
                          clockOffsetFromDirectUTCTiming :
                          undefined;

    if (clockOffset != null && hasLoadedClock !== true) {
      args.externalClockOffset = clockOffset;
    } else if (isDynamic && hasLoadedClock !== true) {
      const UTCTimingHTTPURL = getHTTPUTCTimingURL(mpdIR);
      if (UTCTimingHTTPURL != null && UTCTimingHTTPURL.length > 0) {
        // TODO fetch UTCTiming and XLinks at the same time
        return {
          type: "needs-clock",
          value: {
            url: UTCTimingHTTPURL,
            continue: function continueParsingMPD(
              responseDataClock : IResponseData<string>) {
              if (!responseDataClock.success) {
                warnings.push(responseDataClock.error);
                log.warn("DASH Parser: Error on fetching the clock ressource",
                         responseDataClock.error);
                return parseMpdIr(mpdIR, args, warnings, true);
              }
              args.externalClockOffset = getClockOffset(responseDataClock.data);
              return parseMpdIr(mpdIR, args, warnings, true);
            },
          },
        };
      }
    }
  }

  const xlinksToLoad : Array<{ index : number; ressource : string }> = [];
  for (let i = 0; i < rootChildren.periods.length; i++) {
    const { xlinkHref, xlinkActuate } = rootChildren.periods[i].attributes;
    if (xlinkHref != null && xlinkActuate === "onLoad") {
      xlinksToLoad.push({ index: i, ressource: xlinkHref });
    }
  }

  if (xlinksToLoad.length === 0) {
    return parseCompleteIntermediateRepresentation(mpdIR, args, warnings, xlinkInfos);
  }

  return {
    type: "needs-xlinks",
    value: {
      xlinksUrls: xlinksToLoad.map(({ ressource }) => ressource),
      continue: function continueParsingMPD(loadedRessources : ILoadedXlinkData[]) {
        if (loadedRessources.length !== xlinksToLoad.length) {
          throw new Error("DASH parser: wrong number of loaded ressources.");
        }

        // Note: It is important to go from the last index to the first index in
        // the resulting array, as we will potentially add elements to the array
        for (let i = loadedRessources.length - 1; i >= 0; i--) {
          const index = xlinksToLoad[i].index;
          const { parsed: periodsIR,
                  warnings: parsingWarnings,
                  receivedTime,
                  sendingTime,
                  url } = loadedRessources[i];

          if (parsingWarnings.length > 0) {
            warnings.push(...parsingWarnings);
          }

          for (const periodIR of periodsIR) {
            xlinkInfos.set(periodIR, { receivedTime, sendingTime, url });
          }

          // replace original "xlinked" periods by the real deal
          rootChildren.periods.splice(index, 1, ...periodsIR);
        }
        return parseMpdIr(mpdIR, args, warnings, hasLoadedClock, xlinkInfos);
      },
    },
  };
}

/**
 * Parse the MPD intermediate representation into a regular Manifest.
 * @param {Object} mpdIR
 * @param {Object} args
 * @param {Array.<Object>} warnings
 * @param {Object} xlinkInfos
 * @returns {Object}
 */
function parseCompleteIntermediateRepresentation(
  mpdIR : IMPDIntermediateRepresentation,
  args : IMPDParserArguments,
  warnings : Error[],
  xlinkInfos : IXLinkInfos
) : IIrParserResponseDone {
  const { children: rootChildren,
          attributes: rootAttributes } = mpdIR;
  const isDynamic : boolean = rootAttributes.type === "dynamic";
  const initialBaseUrl : IResolvedBaseUrl[] = args.url !== undefined ?
    [{ url: normalizeBaseURL(args.url),
       availabilityTimeOffset: 0,
       availabilityTimeComplete: true }] :
    [];
  const mpdBaseUrls = resolveBaseURLs(initialBaseUrl, rootChildren.baseURLs);
  const availabilityStartTime = parseAvailabilityStartTime(rootAttributes,
                                                           args.referenceDateTime);
  const timeShiftBufferDepth = rootAttributes.timeShiftBufferDepth;
  const { externalClockOffset: clockOffset,
          unsafelyBaseOnPreviousManifest } = args;

  const manifestInfos = { availabilityStartTime,
                          baseURLs: mpdBaseUrls,
                          clockOffset,
                          duration: rootAttributes.duration,
                          isDynamic,
                          manifestProfiles: mpdIR.attributes.profiles,
                          receivedTime: args.manifestReceivedTime,
                          timeShiftBufferDepth,
                          unsafelyBaseOnPreviousManifest,
                          xlinkInfos,
                          xmlNamespaces: mpdIR.attributes.namespaces };
  const parsedPeriods = parsePeriods(rootChildren.periods, manifestInfos);
  const mediaPresentationDuration = rootAttributes.duration;

  let lifetime : number | undefined;
  let minimumTime : number | undefined;
  let timeshiftDepth : number | null = null;
  let maximumTimeData : { isLinear : boolean;
                          maximumSafePosition : number;
                          livePosition : number | undefined;
                          time : number; };

  if (rootAttributes.minimumUpdatePeriod !== undefined &&
      rootAttributes.minimumUpdatePeriod >= 0)
  {
    lifetime = rootAttributes.minimumUpdatePeriod === 0 ?
      config.getCurrent().DASH_FALLBACK_LIFETIME_WHEN_MINIMUM_UPDATE_PERIOD_EQUAL_0 :
      rootAttributes.minimumUpdatePeriod;
  }

  const { minimumSafePosition,
          maximumSafePosition,
          maximumUnsafePosition } = getMinimumAndMaximumPositions(parsedPeriods);
  const now = performance.now();

  if (!isDynamic) {
    minimumTime = minimumSafePosition !== undefined     ? minimumSafePosition :
                  parsedPeriods[0]?.start !== undefined ? parsedPeriods[0].start :
                                                          0;
    let finalMaximumSafePosition = mediaPresentationDuration ?? Infinity;
    if (parsedPeriods[parsedPeriods.length - 1] !== undefined) {
      const lastPeriod = parsedPeriods[parsedPeriods.length - 1];
      const lastPeriodEnd = lastPeriod.end ??
                            (lastPeriod.duration !== undefined ?
                              lastPeriod.start + lastPeriod.duration :
                              undefined);
      if (lastPeriodEnd !== undefined && lastPeriodEnd < finalMaximumSafePosition) {
        finalMaximumSafePosition = lastPeriodEnd;
      }
    }
    if (maximumSafePosition !== undefined &&
        maximumSafePosition < finalMaximumSafePosition)
    {
      finalMaximumSafePosition = maximumSafePosition;
    }

    maximumTimeData = { isLinear: false,
                        maximumSafePosition: finalMaximumSafePosition,
                        livePosition: undefined,
                        time: now };
  } else {
    minimumTime = minimumSafePosition;
    timeshiftDepth = timeShiftBufferDepth ?? null;
    let finalMaximumSafePosition : number;
    let livePosition;

    if (maximumUnsafePosition !== undefined) {
      livePosition = maximumUnsafePosition;
    }

    if (maximumSafePosition !== undefined) {
      finalMaximumSafePosition = maximumSafePosition;
    } else {
      const ast = availabilityStartTime ?? 0;
      const { externalClockOffset } = args;
      if (externalClockOffset === undefined) {
        log.warn("DASH Parser: use system clock to define maximum position");
        finalMaximumSafePosition = (Date.now() / 1000) - ast;
      } else {
        const serverTime = performance.now() + externalClockOffset;
        finalMaximumSafePosition = (serverTime / 1000) - ast;
      }
    }
    if (livePosition === undefined) {
      livePosition = finalMaximumSafePosition;
    }
    maximumTimeData = { isLinear: true,
                        maximumSafePosition: finalMaximumSafePosition,
                        livePosition,
                        time: now };

    // if the minimum calculated time is even below the buffer depth, perhaps we
    // can go even lower in terms of depth
    if (timeshiftDepth !== null && minimumTime !== undefined &&
        finalMaximumSafePosition - minimumTime > timeshiftDepth)
    {
      timeshiftDepth = finalMaximumSafePosition - minimumTime;
    }
  }

  // `isLastPeriodKnown` should be `true` in two cases for DASH contents:
  //   1. When the content is static, because we know that no supplementary
  //      Period will be added.
  //   2. If the content is dynamic, only when both the duration is known and
  //      the `minimumUpdatePeriod` is not set. This corresponds to the case
  //      explained in "4.6.4. Transition Phase between Live and On-Demand" of
  //      the DASH-IF IOP v4.3 for live contents transitionning to on-demand.
  const isLastPeriodKnown =
    !isDynamic ||
    (mpdIR.attributes.minimumUpdatePeriod === undefined &&
     (parsedPeriods[parsedPeriods.length - 1]?.end !== undefined ||
      mpdIR.attributes.duration !== undefined));

  const parsedMPD : IParsedManifest = {
    availabilityStartTime,
    clockOffset: args.externalClockOffset,
    isDynamic,
    isLive: isDynamic,
    isLastPeriodKnown,
    periods: parsedPeriods,
    publishTime: rootAttributes.publishTime,
    suggestedPresentationDelay: rootAttributes.suggestedPresentationDelay,
    transportType: "dash",
    timeBounds: { minimumSafePosition: minimumTime,
                  timeshiftDepth,
                  maximumTimeData },
    lifetime,
    uris: args.url == null ?
      rootChildren.locations : [args.url, ...rootChildren.locations],
  };

  return { type: "done", value: { parsed: parsedMPD, warnings } };
}
