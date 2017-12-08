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

import generateNewId from "../../../../utils/id";
import log from "../../../../utils/log";
import {
  resolveURL,
} from "../../../../utils/url";
import {
  parseBoolean,
  parseDuration,
} from "../helpers";
import parseAdaptationSet, {
  IContentProtectionParser,
  IParsedAdaptationSet,
} from "./AdaptationSet";

export interface IParsedPeriod {
  // required
  id : string;
  adaptations : IParsedAdaptationSet[];

  // optional
  start? : number;
  duration? : number;
  bitstreamSwitching? : boolean;
}

/**
 * Parse a single manifest period.
 * @param {Node} root - Root Node of the period
 * @param {string} rootURL - Base URL for segments contained in this period.
 * @param {Function} contentProtectionParser
 * @returns {Object}
 */
export default function parsePeriod(
  root: Node,
  rootURL : string,
  contentProtectionParser?: IContentProtectionParser
): IParsedPeriod {
  let periodRootURL = rootURL;

  const adaptationNodes : Node[] = [];
  const periodChildren = root.childNodes;
  for (let i = 0; i < periodChildren.length; i++) {
    const currentNode = periodChildren[i];

    switch (currentNode.nodeName) {

      case "BaseURL":
        periodRootURL = resolveURL(periodRootURL, currentNode.textContent || "");
        break;

      case "AdaptationSet":
        adaptationNodes.push(currentNode);
        break;
    }
  }

  const adaptations = adaptationNodes.map((adaptationNode) => {
    return parseAdaptationSet(adaptationNode, periodRootURL, contentProtectionParser);
  });

  let id : string|undefined;
  let start : number|undefined;
  let duration : number|undefined;
  let bitstreamSwitching : boolean|undefined;
  for (let i = 0; i < root.attributes.length; i++) {
    const attribute = root.attributes[i];

    switch (attribute.name) {
      case "id":
        id = attribute.value;
        break;
      case "start": {
        const tempStart = parseDuration(attribute.value);
        if (!isNaN(tempStart)) {
          start = tempStart;
        } else {
          log.warn("DASH: Unrecognized start in the mpd:", attribute.value);
        }
      }
        break;
      case "duration": {
        const tempDuration = parseDuration(attribute.value);
        if (!isNaN(tempDuration)) {
          duration = tempDuration;
        } else {
          log.warn("DASH: Unrecognized duration in the mpd:", attribute.value);
        }
      }
        break;
      case "bitstreamSwitching":
        bitstreamSwitching = parseBoolean(attribute.value);
        break;

    }
  }

  if (id == null) {
    log.warn("DASH: No usable id found in the Period. Generating one.");
    id = "gen-dash-period-" + generateNewId();
  }

  const parsedPeriod : IParsedPeriod = {
    id,
    adaptations,
  };

  if (start != null) {
    parsedPeriod.start = start;
  }

  if (duration != null) {
    parsedPeriod.duration = duration;
  }

  if (bitstreamSwitching != null) {
    parsedPeriod.bitstreamSwitching = bitstreamSwitching;
  }

  return parsedPeriod;
}

export { IContentProtectionParser };
