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
  IEventStreamEventIntermediateRepresentation,
  IEventStreamIntermediateRepresentation,
} from "../../node_parser_types";
import {
  parseMPDInteger,
  ValueParser,
} from "./utils";

/**
 * Parse the EventStream node to extract Event nodes and their
 * content.
 * @param {Element} element
 * @returns {Array}
 */
export default function parseEventStream(
  element: Element
): [IEventStreamIntermediateRepresentation, Error[]] {
  const eventStreamIR: IEventStreamIntermediateRepresentation = {
    children: { events : [] },
    attributes: {},
  };
  let warnings: Error[] = [];

  // 1 - Parse attributes
  const parseValue = ValueParser(eventStreamIR.attributes, warnings);
  for (let i = 0; i < element.attributes.length; i++) {
    const attr = element.attributes[i];
    switch (attr.name) {

      case "schemeIdUri":
        eventStreamIR.attributes.schemeIdUri = attr.value;
        break;

      case "timescale":
        parseValue(attr.value, { asKey: "timescale",
                                 parser: parseMPDInteger,
                                 dashName: "timescale" });
        break;

      case "value":
        eventStreamIR.attributes.value = attr.value;
        break;
    }
  }

  for (let i = 0; i < element.childNodes.length; i++) {
    if (element.childNodes[i].nodeType === Node.ELEMENT_NODE) {
      const currentElement = element.childNodes[i] as Element;

      switch (currentElement.nodeName) {

        case "Event":
          const [event, eventWarnings] = parseEvent(currentElement);
          eventStreamIR.children.events.push(event);
          if (eventWarnings.length > 0) {
            warnings = warnings.concat(eventWarnings);
          }
          break;
      }
    }
  }

  return [eventStreamIR, warnings];
}

/**
 * Parse `Event` Element, as found in EventStream nodes.
 * @param {Element} element
 * @returns {Array}
 */
function parseEvent(
  element: Element
): [IEventStreamEventIntermediateRepresentation, Error[]] {
  const eventIR: IEventStreamEventIntermediateRepresentation = {
    eventStreamData : element,
  };
  const warnings : Error[] = [];

  // 1 - Parse attributes
  const parseValue = ValueParser(eventIR, warnings);
  for (let i = 0; i < element.attributes.length; i++) {
    const attr = element.attributes[i];
    switch (attr.name) {
      case "presentationTime":
        parseValue(attr.value, { asKey: "presentationTime",
                                 parser: parseMPDInteger,
                                 dashName: "presentationTime" });
        break;
      case "duration":
        parseValue(attr.value, { asKey: "duration",
                                 parser: parseMPDInteger,
                                 dashName: "duration" });
        break;
      case "id":
        eventIR.id = attr.value;
        break;
    }
  }
  return [eventIR, warnings];
}
