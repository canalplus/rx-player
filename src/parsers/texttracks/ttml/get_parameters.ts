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

import log from "../../../log";
import isNonEmptyString from "../../../utils/is_non_empty_string";

const CELL_RESOLUTION_REGEXP = /(\d+) (\d+)/;

export interface ITTParameters { frameRate : number;
                                 subFrameRate : number;
                                 tickRate : number;
                                 spaceStyle: "default"|"preserve";
                                 cellResolution : { columns : number;
                                                    rows : number; }; }

/**
 * Returns global parameters from a TTML Document
 * @param {Element} tt - <tt> node
 * @throws Error - Throws if the spacing style is invalid.
 * @returns {Object}
 */
export default function getParameters(tt : Element) : ITTParameters {
  const parsedFrameRate = tt.getAttribute("ttp:frameRate");
  const parsedSubFrameRate = tt.getAttribute("ttp:subFramRate");
  const parsedTickRate = tt.getAttribute("ttp:tickRate");
  const parsedFrameRateMultiplier = tt.getAttribute("ttp:frameRateMultiplier");
  const parsedSpaceStyle = tt.getAttribute("xml:space");
  const parsedCellResolution = tt.getAttribute("ttp:cellResolution");

  let cellResolution : { columns : number; rows : number } = { columns: 32,
                                                               rows : 15 };
  if (parsedCellResolution !== null) {
    const extractedData = CELL_RESOLUTION_REGEXP.exec(parsedCellResolution);
    if (extractedData === null || extractedData.length < 3) {
      log.warn("TTML Parser: Invalid cellResolution");
    } else {
      const columns = parseInt(extractedData[1], 10);
      const rows = parseInt(extractedData[2], 10);
      if (isNaN(columns) || isNaN(rows)) {
        log.warn("TTML Parser: Invalid cellResolution");
      } else {
        cellResolution = { columns, rows };
      }
    }

  }

  if (isNonEmptyString(parsedSpaceStyle) &&
      parsedSpaceStyle !== "default" &&
      parsedSpaceStyle !== "preserve")
  {
    throw new Error("Invalid spacing style");
  }

  let nbFrameRate = Number(parsedFrameRate);
  if (isNaN(nbFrameRate) || nbFrameRate <= 0) {
    nbFrameRate = 30;
  }
  let nbSubFrameRate = Number(parsedSubFrameRate);
  if (isNaN(nbSubFrameRate) || nbSubFrameRate <= 0) {
    nbSubFrameRate = 1;
  }
  let nbTickRate : number | undefined = Number(parsedTickRate);
  if (isNaN(nbTickRate) || nbTickRate <= 0) {
    nbTickRate = undefined;
  }

  let frameRate = nbFrameRate;
  const subFrameRate = nbSubFrameRate != null ? nbSubFrameRate :
                                                1;

  const spaceStyle = parsedSpaceStyle !== null ? parsedSpaceStyle :
                                                 "default";

  const tickRate = nbTickRate !== undefined ? nbTickRate :
                                              nbFrameRate * nbSubFrameRate;

  if (parsedFrameRateMultiplier  !== null) {
    const multiplierResults = /^(\d+) (\d+)$/g.exec(parsedFrameRateMultiplier);
    if (multiplierResults !== null) {
      const numerator = Number(multiplierResults[1]);
      const denominator = Number(multiplierResults[2]);
      const multiplierNum = numerator / denominator;
      frameRate = nbFrameRate * multiplierNum;
    }
  }

  return { cellResolution,
           tickRate,
           frameRate,
           subFrameRate,
           spaceStyle };
}
