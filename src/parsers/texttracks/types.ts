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

import type { ICompatVTTCue } from "../../compat/browser_compatibility_types.ts";

// Item returned by an HMTL text track parser
export interface IHTMLCue {
  start: number;
  end: number;
  element: HTMLElement;
}

/** Function to parse texttracks into native VTT cues */
export type INativeTextTracksParserFn = (
  /**
   * The text track data itself, either as plain text (for textual formats) or
   * as a BufferSource (for binary format such as MP4-embedded VTT).
   */
  texttrack: string | BufferSource,
  /** Optional context information on that text track */
  context: {
    /**
     * If set, there has been a "timescale" that has been parsed from an
     * initialization segment linked to that text track, which contained a
     * timescale value, potentially allowing to convert time information
     * into seconds.
     *
     * This is needed by very few text track formats.
     */
    initTimescale: number | null;
    /**
     * If set, and if there are multiple languages available in the given text
     * track format, then the language selected should be the one corresponding
     * to that string.
     *
     * This is needed by very few text track formats.
     */
    language: string | undefined;
  },
  /** Offset in seconds to add to all subtitles found in `texttrack`. */
  timeOffset: number,
) => Array<ICompatVTTCue | TextTrackCue>;

/** Function to parse texttracks into HTML cues */
export type IHTMLTextTracksParserFn = (
  /**
   * The text track data itself, either as plain text (for textual formats) or
   * as a BufferSource (for binary format such as MP4-embedded VTT).
   */
  texttrack: string | BufferSource,
  /** Optional context information on that text track */
  context: {
    /**
     * If set, there has been a "timescale" that has been parsed from an
     * initialization segment linked to that text track, which contained a
     * timescale value, potentially allowing to convert time information
     * into seconds.
     *
     * This is needed by very few text track formats.
     */
    initTimescale: number | null;
    /**
     * If set, and if there are multiple languages available in the given text
     * track format, then the language selected should be the one corresponding
     * to that string.
     *
     * This is needed by very few text track formats.
     */
    language: string | undefined;
  },
  /** Offset in seconds to add to all subtitles found in `texttrack`. */
  timeOffset: number,
) => IHTMLCue[];
