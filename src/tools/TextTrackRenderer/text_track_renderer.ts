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

import HTMLTextSourceBuffer from "../../custom_source_buffers/text/html";
import {
  addFeatures,
  IFeatureFunction,
} from "../../features";

/** Arguments for the `setTextTrack` method. */
export interface ISetTextTrackArguments {
  /** The text track data. */
  data : string;
  /** The format of the text track data in `data` (e.g. "ttml", "srt", "vtt" or "sami") */
  type : string;
  /**
   * Offset, in seconds, that will be added to each subtitle's start and end time.
   * If not set or if set to `0`, no offset will be added.
   */
  timeOffset? : number;
  /**
   * Define the language of the subtitles.
   * Only required by some formats, such as SAMI.
   * Can be unset for most other cases.
   */
  language? : string;
}

/**
 * Display custom text tracks in the given `textTrackElement`, synchronized
 * with the given `videoElement`.
 * @class TextTrackRenderer
 */
export default class TextTrackRenderer {
  /**
   * Add a given parser from the list of features.
   * @param {Array.<Function>} parsersList
   */
  static addParsers(parsersList : IFeatureFunction[]) : void {
    addFeatures(parsersList);
  }

  private _sourceBuffer : HTMLTextSourceBuffer;

  /**
   * @param {HTMLMediaElement} videoElement - The media element the text track
   * has to be synchronized to.
   * @param {HTMLElement} textTrackElement - The HTML element which will contain
   * the text tracks.
   */
  constructor(
    { videoElement,
      textTrackElement } : { videoElement : HTMLMediaElement;
                             textTrackElement : HTMLElement; }
  ) {
    this._sourceBuffer = new HTMLTextSourceBuffer(videoElement, textTrackElement);
  }

  /**
   * Set the currently displayed text track.
   * Replace previous one if one was already set.
   * @param {Object} args
   */
  public setTextTrack(args : ISetTextTrackArguments) : void {
    this._sourceBuffer.removeSync(0, Number.MAX_VALUE);
    this._sourceBuffer.timestampOffset = typeof args.timeOffset === "number" ?
      args.timeOffset :
      0;
    this._sourceBuffer.appendBufferSync({ timescale: 1,
                                          start: 0,
                                          end: Number.MAX_VALUE,
                                          data: args.data,
                                          language: args.language,
                                          type: args.type });
  }

  /**
   * Completely remove the current text track.
   */
  public removeTextTrack() : void {
    this._sourceBuffer.removeSync(0, Number.MAX_VALUE);
  }

  /**
   * Dispose of most ressources taken by the TextTrackRenderer.
   * /!\ The TextTrackRenderer will be unusable after this method has been
   * called.
   */
  public dispose() {
    this._sourceBuffer.removeSync(0, Number.MAX_VALUE);
    this._sourceBuffer.abort();
  }
}
