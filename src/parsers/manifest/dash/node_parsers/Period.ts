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

import { IManifestStreamEvent } from "../../types";
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
  streamEvents? : IManifestStreamEvent[];
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
 * Parse the EventStream node to extract Event nodes and their
 * content.
 * @param {Element} element
 */
function parseEventStream(element: Element): IManifestStreamEvent[] {
  const streamEvents: IManifestStreamEvent[] = [];
  const attributes: { schemeId?: string;
                      timescale: number;
                      value?: string; } =
                      { timescale: 1 };

  for (let i = 0; i < element.attributes.length; i++) {
    const attribute = element.attributes[i];
    switch (attribute.name) {
      case "schemeIdUri":
        attributes.schemeId = attribute.value;
        break;
      case "timescale":
        attributes.timescale = parseInt(attribute.value, 10);
        break;
      case "value":
        attributes.value = attribute.value;
        break;
      default:
        break;
    }
  }

  for (let k = 0; k < element.childNodes.length; k++) {
    const node = element.childNodes[k];
    if (node.nodeName === "Event" &&
        node.nodeType === Node.ELEMENT_NODE) {
      let presentationTime;
      let duration;
      let id;
      const eventAttributes = (node as Element).attributes;
      for (let j = 0; j < eventAttributes.length; j++) {
        const attribute = eventAttributes[j];
        switch (attribute.name) {
          case "presentationTime":
            const pts = parseInt(attribute.value, 10);
            presentationTime = pts / attributes.timescale;
            break;
          case "duration":
            const eventDuration = parseInt(attribute.value, 10);
            duration = eventDuration / attributes.timescale;
            break;
          case "id":
            id = attribute.value;
            break;
          default:
            break;
        }
      }
      const streamEvent = { presentationTime,
                            duration,
                            id,
                            element: node };
      streamEvents.push(streamEvent);
    }
  }
  return streamEvents;
}

/**
 * @param {NodeList} periodChildren
 * @returns {Array}
 */
function parsePeriodChildren(periodChildren : NodeList) : [IPeriodChildren, Error[]] {
  const baseURLs : IBaseURL[] = [];
  const adaptations : IAdaptationSetIntermediateRepresentation[] = [];

  let warnings : Error[] = [];
  const streamEvents = [];
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

        case "EventStream":
          const newStreamEvents =
            parseEventStream(currentElement);
          streamEvents.push(...newStreamEvents);
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
        parseValue(attr.value, { asKey: "start",
                                      parser: parseDuration,
                                      dashName: "start" });
        break;

      case "duration":
        parseValue(attr.value, { asKey: "duration",
                                      parser: parseDuration,
                                      dashName: "duration" });
        break;

      case "bitstreamSwitching":
        parseValue(attr.value, { asKey: "bitstreamSwitching",
                                      parser: parseBoolean,
                                      dashName: "bitstreamSwitching" });
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
