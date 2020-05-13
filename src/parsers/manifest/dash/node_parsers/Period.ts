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
  ValueParser,
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
 * @returns {Array}
 */
function parsePeriodChildren(periodChildren : NodeList) : [IPeriodChildren, Error[]] {
  const baseURLs : IBaseURL[] = [];
  const adaptations : IAdaptationSetIntermediateRepresentation[] = [];

  let warnings : Error[] = [];
  for (let i = 0; i < periodChildren.length; i++) {
    if (periodChildren[i].nodeType === Node.ELEMENT_NODE) {
      const currentElement = periodChildren[i] as Element;

      switch (currentElement.nodeName) {

        case "BaseURL":
          const [baseURLObj, baseURLWarnings] = parseBaseURL(currentElement);
          if (baseURLObj !== undefined) {
            baseURLs.push(baseURLObj);
          }
          warnings = warnings.concat(baseURLWarnings);
          break;

        case "AdaptationSet":
          const [adaptation, adaptationWarnings] =
            createAdaptationSetIntermediateRepresentation(currentElement);
          adaptations.push(adaptation);
          warnings = warnings.concat(adaptationWarnings);
          break;
      }
    }
  }

  return [{ baseURLs, adaptations }, warnings];
}

/**
 * @param {Element} periodElement
 * @returns {Array}
 */
function parsePeriodAttributes(periodElement : Element) : [IPeriodAttributes, Error[]] {
  const res : IPeriodAttributes = {};
  const warnings : Error[] = [];
  const parseValue = ValueParser(res, warnings);
  for (let i = 0; i < periodElement.attributes.length; i++) {
    const attr = periodElement.attributes[i];

    switch (attr.name) {

      case "id":
        res.id = attr.value;
        break;

      case "start":
        parseValue("start", attr.value, parseDuration, "start");
        break;

      case "duration":
        parseValue("duration", attr.value, parseDuration, "duration");
        break;

      case "bitstreamSwitching":
        parseValue("bitstreamSwitching", attr.value, parseBoolean, "bitstreamSwitching");
        break;

      case "xlink:href":
        res.xlinkHref = attr.value;
        break;

      case "xlink:actuate":
        res.xlinkActuate = attr.value;
        break;
    }
  }
  return [res, warnings];
}

/**
 * @param {Element} periodElement
 * @returns {Array}
 */
export function createPeriodIntermediateRepresentation(
  periodElement : Element
) : [IPeriodIntermediateRepresentation, Error[]] {
  const [children, childrenWarnings] = parsePeriodChildren(periodElement.childNodes);
  const [attributes, attrsWarnings] = parsePeriodAttributes(periodElement);
  const warnings = childrenWarnings.concat(attrsWarnings);
  return [{ children, attributes }, warnings];
}
