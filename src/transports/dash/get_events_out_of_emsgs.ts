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

import { IInbandEvent, IManifestRefreshEvent } from "../../core/stream";
import { ISegment } from "../../manifest";
import { IEMSG } from "../../parsers/containers/isobmff";
import { utf8ToStr } from "../../tools/string_utils";

/**
 * Transform multiple EMSGs with manifest validity scheme id
 * into one manifest refresh event
 * @param {Array.<Object>} emsgs
 * @param {Object} segment
 * @param {number} manifestPublishTime
 * @returns {undefined | Object}
 */
function getManifestRefreshEvent(emsgs: IEMSG[],
                                 segment: ISegment,
                                 manifestPublishTime: number
): IManifestRefreshEvent|undefined {
  if (emsgs.length <= 0) {
    return undefined;
  }
  let minManifestExpiration: undefined | number;
  const len = emsgs.length;
  for (let i = 0; i < len; i++) {
    const manifestRefreshEventFromEMSGs = emsgs[i];
    const currentManifestPublishTime = manifestPublishTime;
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
  if (minManifestExpiration === undefined) {
    return undefined;
  }
  return { type: "manifest-refresh",
           value: { manifestExpirationTime: minManifestExpiration } };
}

/**
 * Get wrapped inband events and manifest refresh event from
 * parsed ISOBMFF EMSG boxes.
 * @param {Array.<Object>} parsedEMSGs
 * @param {Object} segment
 * @param {undefined | number} manifestPublishTime
 * @returns {Object}
 */
export default function getEventsOutOfEMSGs(
  parsedEMSGs: IEMSG[],
  segment: ISegment,
  manifestPublishTime?: number
): { manifestRefreshEvent: IManifestRefreshEvent | undefined;
     inbandEvents: IInbandEvent[] | undefined; } | undefined {
  if (parsedEMSGs.length === 0) {
    return undefined;
  }
  const { manifestRefreshEventsFromEMSGs,
          EMSGs } = parsedEMSGs
    .reduce((acc, val: IEMSG) => {
      // Scheme that signals manifest update
      if (val.schemeId === "urn:mpeg:dash:event:2012" &&
          // TODO support value 2 and 3
          val.value === "1") {
        if (acc.manifestRefreshEventsFromEMSGs === undefined) {
          acc.manifestRefreshEventsFromEMSGs = [];
        }
        acc.manifestRefreshEventsFromEMSGs.push(val);
      } else {
        if (acc.EMSGs === undefined) {
          acc.EMSGs = [];
        }
        acc.EMSGs.push(val);
      }
      return acc;
    }, { manifestRefreshEventsFromEMSGs: undefined as IEMSG[]|undefined,
         EMSGs: undefined as IEMSG[]|undefined });
  const inbandEvents = EMSGs?.map((evt) => ({ type: "dash-emsg" as const,
                                              value: evt }));
  const manifestRefreshEvent =
    (manifestPublishTime === undefined ||
     manifestRefreshEventsFromEMSGs === undefined) ?
      undefined :
      getManifestRefreshEvent(manifestRefreshEventsFromEMSGs,
                              segment,
                              manifestPublishTime);
  return { inbandEvents, manifestRefreshEvent };
}
