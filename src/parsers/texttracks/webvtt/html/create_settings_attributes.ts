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

/*
 * How far from edge to start translating the text's origin,
 * in order to keep all text inside it's box.
 */
import objectValues from "../../../../utils/object_values";

const DEFAULT_HORIZONTAL_OFFSET = 30;
const DEFAULT_VERTICAL_OFFSET = 5;

export default function createSettingsAttributes (
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
    `${getWidthStyle(settings.size)}` +
    `${getPositionStyle(settings.position)}` +
    `${getLineStyle(settings.line)}` +
    `${getAlignStyle(settings.align)}`
  );
};

const getTransformStyle = (settings: Partial<Record<string, string>>) => {
  const xTranslateDefault = 50;
  const yTranslateDefault = 50;

  let xPosition = getPercentageValue(settings.position);
  xPosition = xPosition !== null ?
    xPosition :
    xTranslateDefault;

  let yPosition = getPercentageValue(settings.line);
  yPosition = yPosition !== null ?
    yPosition :
    yTranslateDefault;

  const width = getPercentageValue(settings.size);
  const xOffset = width !== null ?
    width :
    DEFAULT_HORIZONTAL_OFFSET;
  const yOffset = DEFAULT_VERTICAL_OFFSET;

  const isCloseToXEdge = xPosition < xOffset || xPosition > (100 - xOffset);
  const isCloseToYEdge = yPosition < yOffset || yPosition > (100 - yOffset);

  const xTranslate = isCloseToXEdge ? xPosition : xTranslateDefault;
  const yTranslate = isCloseToYEdge ? yPosition : yTranslateDefault;

  return `transform: translate(-${xTranslate}%,-${yTranslate}%);`;

} ;

const getWidthStyle = (size: string | undefined) => {
  return size !== undefined ?
    `width:${size};` :
    "";
};

const getPositionStyle = (positionSetting: string | undefined) => {
  const positionDefault = 50;
  let position = getPercentageValue(positionSetting);
  position = position !== null ?
    position :
    positionDefault;

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
  return `top:${line}%;`;
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
