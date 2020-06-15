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

export interface IStreamEventData {
  type: "dash-event-stream";
  value: { schemeIdUri: string;
           timescale: number;
           element: Element; };
}

export interface IStreamEventPayload {
  id?: string;
  start: number;
  end: number;
  data: IStreamEventData;
  publicEvent: IPublicStreamEvent;
}

export interface INonFiniteStreamEventPayload {
  id?: string;
  start: number;
  data: IStreamEventData;
  publicEvent: IPublicNonFiniteStreamEvent;
}

/** The `value` of the event actually sent for an event with no associated end. */
export interface IPublicNonFiniteStreamEvent {
  data: IStreamEventData;
  start: number;
}

/** The `value` of the event actually sent for an event with an associated end. */
export interface IPublicStreamEvent {
  data: IStreamEventData;
  start: number;
  end: number;
  onExit?: () => void;
}

/** Events sent by the `streamEventsEmitter`. */
export interface IStreamEvent {
  type: "stream-event" | "stream-event-skip";
  value: IPublicStreamEvent | IPublicNonFiniteStreamEvent;
}
