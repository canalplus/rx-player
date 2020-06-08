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

export interface IParsedStreamEvent {
  eventPresentationTime: number;
  duration?: number;
  timescale: number;
  id?: string;
  data: { type: "element";
          value: Element; };
}

/**
 * Parse the EventStream node to extract Event nodes and their
 * content.
 * @param {Element} element
 */
function parseEventStream(element: Element): IParsedStreamEvent[] {
  const streamEvents: IParsedStreamEvent[] = [];
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
      let eventPresentationTime = 0;
      let duration;
      let id;
      const eventAttributes = (node as Element).attributes;
      for (let j = 0; j < eventAttributes.length; j++) {
        const attribute = eventAttributes[j];
        switch (attribute.name) {
          case "presentationTime":
            eventPresentationTime = parseInt(attribute.value, 10);
            break;
          case "duration":
            duration = parseInt(attribute.value, 10);
            break;
          case "id":
            id = attribute.value;
            break;
          default:
            break;
        }
      }
      const streamEvent = { eventPresentationTime,
                            duration,
                            timescale: attributes.timescale,
                            id,
                            data: { type: "element" as const,
                                    value: node as Element } };
      streamEvents.push(streamEvent);
    }
  }
  return streamEvents;
}

export default parseEventStream;
