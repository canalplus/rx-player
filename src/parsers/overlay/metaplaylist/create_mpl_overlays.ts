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
  IHTMLOverlay,
  IOverlayData,
} from "../types";
import parseOverlays from "./parse_overlays";

export default function createMetaPlaylistOverlays(
  overlays : IOverlayData[],
  timeOffset : number
) : IHTMLOverlay[] {
  // make sure they are sorted by start date
  overlays.sort((overlayDataA, overlayDataB) => {
    return overlayDataA.start - overlayDataB.start;
  });

  const parsedOverlays = parseOverlays(overlays);

  return parsedOverlays.map(overlayData => {
    const div = document.createElement("div");
    div.style.position = "absolute";
    div.style.height = "100%";
    div.style.width = "100%";

    for (let i = 0; i < overlayData.elements.length; i++) {
      const element = overlayData.elements[i];
      const img = document.createElement("img");
      img.style.position = "absolute";
      img.style.width = element.width;
      img.style.height = element.height;
      img.style.top = element.yAxis;
      img.style.left = element.xAxis;
      img.src = element.url;
      div.appendChild(img);
    }

    return {
      start: overlayData.start + timeOffset,
      end: overlayData.end + timeOffset,
      element: div,
    };
  });
}
