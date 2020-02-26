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

import log from "../../../../log";
import {
  createAdaptationSetIntermediateRepresentation,
  IAdaptationSetIntermediateRepresentation,
} from "./AdaptationSet";
import parseBaseURL, {
  IBaseURL
} from "./BaseURL";
import {
  parseBoolean,
  parseDuration,
} from "./utils";

export interface IPeriodIntermediateRepresentation {
  children : IPeriodChildren;
  attributes : IPeriodAttributes;
}

// intermediate representation for a Period's children
export interface IPeriodChildren {
  // required
  adaptations : IAdaptationSetIntermediateRepresentation[];
  baseURLs : IBaseURL[];
}

// intermediate representation for a Period's attributes
export interface IPeriodAttributes {
  // optional
  id? : string;
  start? : number;
  duration? : number;
  bitstreamSwitching? : boolean;
  xlinkHref? : string;
  xlinkActuate? : string;
}

/**
 * @param {NodeList} periodChildren
 * @returns {Object}
 */
function parsePeriodChildren(periodChildren : NodeList) : IPeriodChildren {
  const baseURLs : IBaseURL[] = [];
  const adaptations : IAdaptationSetIntermediateRepresentation[] = [];

  for (let i = 0; i < periodChildren.length; i++) {
    if (periodChildren[i].nodeType === Node.ELEMENT_NODE) {
      const currentElement = periodChildren[i] as Element;

      switch (currentElement.nodeName) {

        case "BaseURL":
          const baseURLObj = parseBaseURL(currentElement);
          if (baseURLObj !== undefined) {
            baseURLs.push(baseURLObj);
          }
          break;

        case "AdaptationSet":
          const adaptation =
            createAdaptationSetIntermediateRepresentation(currentElement);
          adaptations.push(adaptation);
          break;
      }
    }
  }

  return { baseURLs, adaptations };
}

/**
 * @param {Element} periodElement
 * @returns {Object}
 */
function parsePeriodAttributes(periodElement : Element) : IPeriodAttributes {
  const res : IPeriodAttributes = {};
  for (let i = 0; i < periodElement.attributes.length; i++) {
    const attribute = periodElement.attributes[i];

    switch (attribute.name) {
      case "id":
        res.id = attribute.value;
        break;
      case "start": {
        const tempStart = parseDuration(attribute.value);
        if (!isNaN(tempStart)) {
          res.start = tempStart;
        } else {
          log.warn("DASH: Unrecognized start in the mpd:", attribute.value);
        }
      }
        break;
      case "duration": {
        const tempDuration = parseDuration(attribute.value);
        if (!isNaN(tempDuration)) {
          res.duration = tempDuration;
        } else {
          log.warn("DASH: Unrecognized duration in the mpd:", attribute.value);
        }
      }
        break;
      case "bitstreamSwitching":
        res.bitstreamSwitching = parseBoolean(attribute.value);
        break;

      case "xlink:href":
        res.xlinkHref = attribute.value;
        break;

      case "xlink:actuate":
        res.xlinkActuate = attribute.value;
        break;
    }
  }
  return res;
}

export function createPeriodIntermediateRepresentation(
  periodElement : Element
) : IPeriodIntermediateRepresentation {
  return {
    children: parsePeriodChildren(periodElement.childNodes),
    attributes: parsePeriodAttributes(periodElement),
  };
}
