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
  IOverlayData,
  IOverlayElement,
} from "../types";

interface IParsedOverlay {
  start : number; // timescaled start
  end: number; // timescaled end
  elements : IOverlayElement[];
}

// TODO this can be simplified x1000
/**
 * Determine which overlays are to display in a period of time
 *
 * ```
 * real start                                             real end
 *     |-----------------------------------------------------|
 *        |=====|
 *            |=====|
 *                      |====|
 *                           |=====================|  <-- baseElement(s)
 *
 *                       baseStart              baseEnd
 *                           |---------------------|
 *                              |=====|
 *                                |=======|
 *                                   |===|
 *                                             |=======|
 * ```
 *
 * ```
 * |====| : Overlay
 * ```
 */
export default function parseOverlays(
  overlays : IOverlayData[],
  firstElementIndex : number = 0,
  baseStart : number = 0,
  baseEnd : number = Infinity,
  baseElements : IOverlayElement[] = []
) : IParsedOverlay[] {
  let parsedOverlays : IParsedOverlay[] = [];
  let newLimitEnd = baseStart;
  for (let i = firstElementIndex; i < overlays.length; i++) {
    const overlayData = overlays[i];
    const { start, end, timescale } = overlayData;
    const timescaledStart = Math.max(start / timescale, newLimitEnd);

    if (timescaledStart >= baseEnd) {
      // we looped through every possible overlays
      break;
    }

    const timescaledEnd = end / timescale;
    if (newLimitEnd >= timescaledEnd) {
      // This overlay has already been handled here, go to next one
      // TODO Mutate i instead
      continue;
    }

    // add period without overlay if one
    if (timescaledStart > newLimitEnd && baseElements.length) {
      parsedOverlays.push({
        start: newLimitEnd,
        end: timescaledStart,
        elements: baseElements,
      });
    }

    // if last overlay here
    if (i >= overlays.length - 1) {
      // move offset to current overlay
      newLimitEnd = Math.min(timescaledEnd, baseEnd);
      const allElements = baseElements.concat(overlayData.elements);

      // this is the last overlay push it
      if (allElements.length) {
        parsedOverlays.push({
          start: timescaledStart,
          end: newLimitEnd,
          elements: allElements,
        });
      }
    } else {
      const nextOverlay = overlays[i + 1];
      const nextOvTimescaledStart = nextOverlay.start / nextOverlay.timescale;
      const nextOvTimescaledEnd = nextOverlay.end / nextOverlay.timescale;

      if (nextOvTimescaledStart >= timescaledEnd) {
        // move offset to current overlay
        newLimitEnd = Math.min(timescaledEnd, baseEnd);
        const allElements = baseElements.concat(overlayData.elements);

        // The next one is trictly after this one, push the current one only
        if (allElements.length) {
          parsedOverlays.push({
            start: timescaledStart,
            end: Math.min(timescaledEnd, baseEnd),
            elements: allElements,
          });
        }
      } else {
        // move offset to current overlay
        newLimitEnd = Math.min(timescaledEnd, baseEnd);
        const allElements = baseElements.concat(overlayData.elements);

        // first push the part without the next one
        if (allElements.length) {
          if (nextOvTimescaledStart > timescaledStart) {
            parsedOverlays.push({
              start: timescaledStart,
              end: Math.min(newLimitEnd, nextOvTimescaledStart),
              elements: allElements,
            });
          }
        }

        // then with the next one
        parsedOverlays = parsedOverlays.concat(parseOverlays(
          overlays,
          i + 2,
          nextOvTimescaledStart,
          Math.min(newLimitEnd, nextOvTimescaledEnd),
          baseElements.concat(overlayData.elements, nextOverlay.elements)
        ));

        if (nextOvTimescaledEnd < timescaledEnd) {
          // last part without the next overlay
          parsedOverlays = parsedOverlays.concat(parseOverlays(
            overlays,
            i + 2,
            nextOvTimescaledEnd,
            timescaledEnd,
            baseElements.concat(overlayData.elements)
          ));
        }
      }
    }
  }

  // we looped through every possible overlays
  if (newLimitEnd < baseEnd && baseElements.length) {
    parsedOverlays.push({
      start: newLimitEnd,
      end: baseEnd,
      elements: baseElements,
    });
  }
  return parsedOverlays;
}
