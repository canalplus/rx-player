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

import type { ICompatVTTCue } from "../../compat";

// Item returned by an HMTL text track parser
export interface IHTMLCue {
  start: number;
  end: number;
  element: HTMLElement;
}

// Function to parse texttracks into native VTT cues
export type INativeTextTracksParserFn = (
  texttrack: string,
  timeOffset: number,
  language?: string,
) => Array<ICompatVTTCue | TextTrackCue>;

// Function to parse texttracks into HTML cues
export type IHTMLTextTracksParserFn = (
  texttrack: string,
  timeOffset: number,
  language?: string,
) => IHTMLCue[];
