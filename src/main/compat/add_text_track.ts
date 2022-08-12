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

import { ICompatTextTrack } from "./browser_compatibility_types";
import { isIEOrEdge } from "./browser_detection";

/**
 * Add text track to the given media element.
 *
 * Returns an object with the following properties:
 *   - track {TextTrack}: the added text track
 *   - trackElement {HTMLElement|undefined}: the added <track> element.
 *     undefined if no trackElement was added.
 *
 * @param {HTMLMediaElement} mediaElement
 * @param {Boolean} hidden - If `true`, the text track will be hidden by
 * default. If `false`, the text track will be directly showing.
 * @returns {Object}
 */
export default function addTextTrack(
  mediaElement : HTMLMediaElement,
  hidden : boolean
) : { track : ICompatTextTrack;
      trackElement : HTMLTrackElement | undefined; }
{
  let track;
  let trackElement;

  const kind = "subtitles";

  if (isIEOrEdge) {
    const tracksLength = mediaElement.textTracks.length;
    track = (tracksLength > 0 ? mediaElement.textTracks[tracksLength - 1] :
                                mediaElement.addTextTrack(kind)) as ICompatTextTrack;
    track.mode = hidden ? (track.HIDDEN ?? "hidden") :
                          (track.SHOWING ?? "showing");
  } else {
    trackElement = document.createElement("track");
    mediaElement.appendChild(trackElement);
    track = trackElement.track;
    trackElement.kind = kind;
    track.mode = hidden ? "hidden" : "showing";
  }
  return { track, trackElement };
}
