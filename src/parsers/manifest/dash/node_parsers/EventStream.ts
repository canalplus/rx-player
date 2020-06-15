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
  parseMPDInteger,
  ValueParser,
} from "./utils";

export interface IParsedStreamEventData { type: "dash-event-stream";
                                          value: { schemeIdUri: string;
                                                   timescale: number;
                                                   element: Element; }; }

export interface IParsedStreamEvent {
  eventPresentationTime: number;
  duration?: number;
  timescale: number;
  id?: string;
  data: IParsedStreamEventData;
}

/**
 * Parse the EventStream node to extract Event nodes and their
 * content.
 * @param {Element} element
 */
function parseEventStream(element: Element): [IParsedStreamEvent[], Error[]] {
  const streamEvents: IParsedStreamEvent[] = [];
  const attributes: { schemeId?: string;
                      timescale: number;
                      value?: string; } = { timescale: 1 };

  const warnings: Error[] = [];
  const parseValue = ValueParser(attributes, warnings);
  for (let i = 0; i < element.attributes.length; i++) {
    const attribute = element.attributes[i];
    switch (attribute.name) {
      case "schemeIdUri":
        attributes.schemeId = attribute.value;
        break;
      case "timescale":
        parseValue(attribute.value, { asKey: "timescale",
                                      parser: parseMPDInteger,
                                      dashName: "timescale" });
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
    const streamEvent: IParsedStreamEvent =
      { id: undefined,
        eventPresentationTime: 0,
        duration: undefined,
        timescale: attributes.timescale,
        data: { type: "dash-event-stream" as const,
                value: { schemeIdUri: attributes.schemeId ?? "",
                         timescale: attributes.timescale,
                         element: node as Element }, }, };

    const parseEventValue = ValueParser(streamEvent, warnings);

    if (node.nodeName === "Event" &&
        node.nodeType === Node.ELEMENT_NODE) {
      const eventAttributes = (node as Element).attributes;
      for (let j = 0; j < eventAttributes.length; j++) {
        const attribute = eventAttributes[j];
        switch (attribute.name) {
          case "presentationTime":
            parseEventValue(attribute.value, { asKey: "eventPresentationTime",
                                               parser: parseMPDInteger,
                                               dashName: "presentationTime" });
            break;
          case "duration":
            parseEventValue(attribute.value, { asKey: "duration",
                                               parser: parseMPDInteger,
                                               dashName: "duration" });
            break;
          case "id":
            streamEvent.id = attribute.value;
            break;
          default:
            break;
        }
      }
      streamEvents.push(streamEvent);
    }
  }
  return [streamEvents, warnings];
}

export default parseEventStream;
