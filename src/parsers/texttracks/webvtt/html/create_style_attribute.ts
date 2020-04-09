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

import objectValues from "../../../../utils/object_values";

/*
 * How far in, in percentage, from the boundary box where the origin
 * of the text box should be shifted in order to no be placed outside the box.
 */
const HORIZONTAL_BOUNDARY_OFFSET = 30;
const VERTICAL_BOUNDARY_OFFSET = 5;

/**
 * Construct a DOM attribute reflecting given cue settings
 * @param {Partial<Record<string, string>>} settings
 * @returns {Attr}
 */
export default function createStyleAttribute (
  settings : Partial<Record<string, string>>
) : Attr {
  const pAttr = document.createAttribute("style");
  pAttr.value = getAttrValue(settings);
  return pAttr;
}

const getAttrValue = (settings: Partial<Record<string, string>>) => {
  const hasSettings = settings !== undefined && objectValues(settings).length !== 0;
  if (!hasSettings) {
    return "text-align:center";
  }

  return (
    "position: absolute;" +
    "margin: 0;" +
    `${getTransformStyle(settings)}` +
    `${getSizeStyle(settings.size)}` +
    `${getPositionStyle(settings.position)}` +
    `${getLineStyle(settings.line)}` +
    `${getAlignStyle(settings.align)}`
  );
};

const getTransformStyle = (settings: Partial<Record<string, string>>) => {
  const xTranslateDefault = 50;
  const xPosition = getPercentageValueOrDefault(settings.position, xTranslateDefault);

  const yTranslateDefault = 50;
  const yPosition = getPercentageValueOrDefault(settings.line, yTranslateDefault);

  const xOffset = getPercentageValueOrDefault(settings.size, HORIZONTAL_BOUNDARY_OFFSET);
  const yOffset = VERTICAL_BOUNDARY_OFFSET;

  const isCloseToXBoundary = xPosition < xOffset || xPosition > (100 - xOffset);
  const isCloseToYBoundary = yPosition < yOffset || yPosition > (100 - yOffset);

  const xTranslate = isCloseToXBoundary ? xPosition : xTranslateDefault;
  const yTranslate = isCloseToYBoundary ? yPosition : yTranslateDefault;

  return `transform: translate(-${xTranslate}%,-${yTranslate}%);`;
} ;

const getSizeStyle = (size: string | undefined) => {
  return size !== undefined ?
    `width:${size};` :
    "";
};

const getPositionStyle = (positionSetting: string | undefined) => {
  const positionDefault = 50;
  const position = getPercentageValueOrDefault(positionSetting, positionDefault);

  return `left:${position}%;`;
};

const getAlignStyle = (alignSetting: string | undefined) => {
  if (alignSetting === undefined) {
    return "";
  }

  const align = alignSetting === "middle" ?
    "center" :
    alignSetting;

  return `text-align:${align};`;
};

const getLineStyle = (lineSetting: string | undefined) => {
  if (lineSetting === undefined) {
    return "";
  }

  const line = getPercentageValue(lineSetting);
  return line !== null ?
    `top:${line}%;` :
    "";
};

const getPercentageValueOrDefault = (
  percentageString: string | undefined, defaultValue: number
): number => {
  const value = getPercentageValue(percentageString);

  return value !== null ?
    value :
    defaultValue;
};

const getPercentageValue = (percentageString: string | undefined): number | null => {
  if (percentageString === undefined) {
    return null;
  }

  const positionRegex = /^([\d.]+)%(?:,(line-left|line-right|center))?$/;
  const positionArr = positionRegex.exec(percentageString);
  if (!Array.isArray(positionArr) || positionArr.length < 2) {
    return null;
  }

  return parseInt(positionArr[1], 10);
};
