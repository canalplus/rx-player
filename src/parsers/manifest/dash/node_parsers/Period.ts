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

import log from "../../../../utils/log";
import {
  parseBoolean,
  parseDuration,
} from "../helpers";
import {
  createAdaptationSetIntermediateRepresentation,
  IAdaptationSetIntermediateRepresentation,
} from "./AdaptationSet";

export interface IPeriodIntermediateRepresentation {
  children : IPeriodChildren;
  attributes : IPeriodAttributes;
}

// intermediate representation for a Period's children
export interface IPeriodChildren {
  // required
  baseURL : string; // BaseURL for the contents. Empty string if not defined
  adaptations : IAdaptationSetIntermediateRepresentation[];
}

// intermediate representation for a Period's attributes
export interface IPeriodAttributes {
  // optional
  id? : string;
  start? : number;
  duration? : number;
  bitstreamSwitching? : boolean;
}

/**
 * @param {NodeList} periodChildren
 * @returns {Object}
 */
function parsePeriodChildren(periodChildren : NodeList) : IPeriodChildren {
  let baseURL = "";
  const adaptations : IAdaptationSetIntermediateRepresentation[] = [];

  for (let i = 0; i < periodChildren.length; i++) {
    const currentNode = periodChildren[i];

    switch (currentNode.nodeName) {

      case "BaseURL":
        baseURL = currentNode.textContent || "";
        break;

      case "AdaptationSet":
        const adaptation =
          createAdaptationSetIntermediateRepresentation(currentNode);
        adaptations.push(adaptation);
        break;
    }
  }

  return { baseURL, adaptations };
}

/**
 * @param {Node} periodNode
 * @returns {Object}
 */
function parsePeriodAttributes(periodNode : Node) : IPeriodAttributes {
  const res : IPeriodAttributes = {};
  for (let i = 0; i < periodNode.attributes.length; i++) {
    const attribute = periodNode.attributes[i];

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

    }
  }
  return res;
}

export function createPeriodIntermediateRepresentation(
  periodNode : Node
) : IPeriodIntermediateRepresentation {
  return {
    children: parsePeriodChildren(periodNode.childNodes),
    attributes: parsePeriodAttributes(periodNode),
  };
}
