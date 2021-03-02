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

import { of as observableOf } from "rxjs";
import {
  IInbandEvent,
  IManifestRefreshEvent,
} from "../../core/stream";
import {
  getMDHDTimescale,
  getSegmentsFromSidx,
  takePSSHOut,
} from "../../parsers/containers/isobmff";
import { IEMSG, parseEmsgBoxes } from "../../parsers/containers/isobmff/utils";
import {
  getSegmentsFromCues,
  getTimeCodeScale,
} from "../../parsers/containers/matroska";
import { BaseRepresentationIndex } from "../../parsers/manifest/dash";
import { utf8ToStr } from "../../tools/string_utils";
import isNullOrUndefined from "../../utils/is_null_or_undefined";
import takeFirstSet from "../../utils/take_first_set";
import {
  IAudioVideoParserObservable,
  ISegmentParserArguments,
  ITransportAudioVideoSegmentParser,
} from "../types";
import getISOBMFFTimingInfos from "../utils/get_isobmff_timing_infos";
import isWEBMEmbeddedTrack from "../utils/is_webm_embedded_track";

/**
 * @param {Object} config
 * @returns {Function}
 */
export default function generateAudioVideoSegmentParser(
  { __priv_patchLastSegmentInSidx } : { __priv_patchLastSegmentInSidx? : boolean }
) : ITransportAudioVideoSegmentParser {
  return function audioVideoSegmentParser(
    { content,
      response,
      initTimescale } : ISegmentParserArguments< Uint8Array |
                                                 ArrayBuffer |
                                                 null >
  ) : IAudioVideoParserObservable {
    const { period, representation, segment, manifest } = content;
    const { data, isChunked } = response;
    const appendWindow : [number, number | undefined] = [ period.start, period.end ];

    if (data === null) {
      if (segment.isInit) {
        const _segmentProtections = representation.getProtectionsInitializationData();
        return observableOf({ type: "parsed-init-segment" as const,
                              value: { initializationData: null,
                                       segmentProtections: _segmentProtections,
                                       initTimescale: undefined } });
      }
      return observableOf({ type: "parsed-segment" as const,
                            value: { chunkData: null,
                                     chunkInfos: null,
                                     chunkOffset: 0,
                                     appendWindow } });
    }

    const chunkData = data instanceof Uint8Array ? data :
                                                   new Uint8Array(data);
    const isWEBM = isWEBMEmbeddedTrack(representation);

    if (!segment.isInit) {
      const chunkInfos = isWEBM ? null : // TODO extract time info from webm
                                  getISOBMFFTimingInfos(chunkData,
                                                        isChunked,
                                                        segment,
                                                        initTimescale);
      const chunkOffset = takeFirstSet<number>(segment.timestampOffset, 0);
      const parsedEMSGs = isWEBM ? undefined : parseEmsgBoxes(chunkData);
      let whitelistedEMSGs;
      if (parsedEMSGs !== undefined) {
        const filteredEMSGs = parsedEMSGs.filter((evt) => {
          if (segment.privateInfos === undefined ||
              segment.privateInfos.isEMSGWhitelisted === undefined) {
            return false;
          }
          return segment.privateInfos.isEMSGWhitelisted(evt);
        });
        if (filteredEMSGs.length > 0) {
          whitelistedEMSGs = filteredEMSGs;
        }
      }
      if (whitelistedEMSGs !== undefined &&
          whitelistedEMSGs.length > 0) {
        const { manifestRefreshEventsFromEMSGs,
                EMSGs } = whitelistedEMSGs
          .reduce((acc, val: IEMSG) => {
            // Scheme that signals manifest update
            if (val.schemeId === "urn:mpeg:dash:event:2012" &&
                // TODO support value 2 and 3
                val.value === "1") {
              acc.manifestRefreshEventsFromEMSGs.push(val);
            } else {
              acc.EMSGs.push(val);
            }
            return acc;
          }, { manifestRefreshEventsFromEMSGs: [] as IEMSG[],
               EMSGs: [] as IEMSG[] });
        let manifestRefreshEvent: IManifestRefreshEvent|undefined;
        if (manifestRefreshEventsFromEMSGs.length > 0) {
          let minManifestExpiration: undefined | number;
          const len = manifestRefreshEventsFromEMSGs.length;
          for (let i = 0; i < len; i++) {
            const manifestRefreshEventFromEMSGs = manifestRefreshEventsFromEMSGs[i];
            const currentManifestPublishTime = manifest.publishTime;
            const { messageData } = manifestRefreshEventFromEMSGs;
            const strPublishTime = utf8ToStr(messageData);
            const eventManifestPublishTime = Date.parse(strPublishTime);
            if (currentManifestPublishTime === undefined ||
                eventManifestPublishTime === undefined ||
                isNaN(eventManifestPublishTime) ||
                // DASH-if 4.3 tells (4.5.2.1) :
                // "The media presentation time beyond the event time (indicated
                // time by presentation_time_delta) is correctly described only
                // by MPDs with publish time greater than indicated value in the
                // message_data field."
                //
                // Here, if the current manifest has its publish time superior
                // to event manifest publish time, then the manifest does not need
                // to be updated
                eventManifestPublishTime < currentManifestPublishTime) {
              break;
            }
            const { timescale, presentationTimeDelta } = manifestRefreshEventFromEMSGs;
            const eventPresentationTime =
              (segment.time / segment.timescale) +
              (presentationTimeDelta / timescale);
            minManifestExpiration =
              minManifestExpiration === undefined ?
                eventPresentationTime :
                Math.min(minManifestExpiration,
                         eventPresentationTime);
          }
          if (minManifestExpiration !== undefined) {
            // redefine manifest expiration time, as typescript does not understand
            // that it can't be undefined when using it in the getDelay callback
            const manifestExpirationTime = minManifestExpiration;
            // const delayComputingTime = performance.now();
            // const getDelay = () => {
            //   const now = performance.now();
            //   const gap = (now - delayComputingTime) / 1000;
            //   return Math.max(0, manifestExpirationTime - position - gap);
            // };
            manifestRefreshEvent = { type: "manifest-refresh",
                                     value: { manifestExpirationTime } };
          }
        }

        const inbandEvents: IInbandEvent[] =
          EMSGs.map((evt) => ({ type: "dash-emsg",
                                value: evt }));

        return observableOf({ type: "parsed-segment",
                              value: { chunkData,
                                       chunkInfos,
                                       chunkOffset,
                                       appendWindow,
                                       inbandEvents,
                                       manifestRefreshEvent } });
      }
      return observableOf({ type: "parsed-segment",
                            value: { chunkData,
                                     chunkInfos,
                                     chunkOffset,
                                     appendWindow } });
    }
    // we're handling an initialization segment
    const { indexRange } = segment;

    let nextSegments;
    if (isWEBM) {
      nextSegments = getSegmentsFromCues(chunkData, 0);
    } else {
      nextSegments = getSegmentsFromSidx(chunkData, Array.isArray(indexRange) ?
                                                      indexRange[0] :
                                                      0);

      // This is a very specific handling for streams we know have a very
      // specific problem at Canal+: The last reference gives a truncated
      // segment.
      // Sadly, people on the packaging side could not fix all legacy contents.
      // This is an easy-but-ugly fix for those.
      // TODO Cleaner way? I tried to always check the obtained segment after
      // a byte-range request but it leads to a lot of code.
      if (__priv_patchLastSegmentInSidx === true &&
          nextSegments !== null &&
          nextSegments.length > 0)
      {
        const lastSegment = nextSegments[ nextSegments.length - 1 ];
        if (Array.isArray(lastSegment.range)) {
          lastSegment.range[1] = Infinity;
        }
      }
    }

    if (representation.index instanceof BaseRepresentationIndex &&
        nextSegments !== null &&
        nextSegments.length > 0)
    {
      representation.index._addSegments(nextSegments);
    }

    const timescale = isWEBM ? getTimeCodeScale(chunkData, 0) :
                               getMDHDTimescale(chunkData);
    const parsedTimescale = isNullOrUndefined(timescale) ? undefined :
                                                           timescale;
    if (!isWEBM) { // TODO extract webm protection information
      const psshInfo = takePSSHOut(chunkData);
      for (let i = 0; i < psshInfo.length; i++) {
        const { systemID, data: psshData } = psshInfo[i];
        representation._addProtectionData("cenc", systemID, psshData);
      }
    }

    const segmentProtections = representation.getProtectionsInitializationData();
    return observableOf({ type: "parsed-init-segment",
                          value: { initializationData: chunkData,
                                   segmentProtections,
                                   initTimescale: parsedTimescale } });
  };
}
