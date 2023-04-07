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

import arrayFind from "../../../utils/array_find";
import isNonEmptyString from "../../../utils/is_non_empty_string";
import objectAssign from "../../../utils/object_assign";
import getParameters, { ITTParameters } from "./get_parameters";
import {
  getStylingAttributes,
  getStylingFromElement,
  IStyleObject,
} from "./get_styling";
import resolveStylesInheritance from "./resolve_styles_inheritance";
import {
  getParentDivElements,
  getBodyNode,
  getRegionNodes,
  getStyleNodes,
  getTextNodes,
} from "./xml_utils";

const STYLE_ATTRIBUTES = [ "align",
                           "backgroundColor",
                           "color",
                           "direction",
                           "display",
                           "displayAlign",
                           "extent",
                           "fontFamily",
                           "fontSize",
                           "fontStyle",
                           "fontWeight",
                           "lineHeight",
                           "opacity",
                           "origin",
                           "overflow",
                           "padding",
                           "textAlign",
                           "textDecoration",
                           "textOutline",
                           "unicodeBidi",
                           "visibility",
                           "wrapOption",
                           "writingMode",

                           // Not managed anywhere for now
                           // "showBackground",
                           // "zIndex",
];

export interface IParsedTTMLCue { /** The DOM Element that contains text node */
                                  paragraph: Element;
                                  /** An offset to apply to cues start and end */
                                  timeOffset: number;
                                  /** An array of objects containing TTML styles */
                                  idStyles: IStyleObject[];
                                  /** An array of objects containing region TTML style */
                                  regionStyles: IStyleObject[];
                                  /** An object containing paragraph style */
                                  paragraphStyle: Partial<Record<string, string>>;
                                  /** An object containing TTML parameters */
                                  ttParams: ITTParameters;
                                  shouldTrimWhiteSpace: boolean;
                                  /** TTML body as a DOM Element */
                                  body: Element | null; }

/**
 * Create array of objects which should represent the given TTML text track.
 * TODO TTML parsing is still pretty heavy on the CPU.
 * Optimizations have been done, principally to avoid using too much XML APIs,
 * but we can still do better.
 * @param {string} str
 * @param {Number} timeOffset
 * @returns {Array.<Object>}
 */
export default function parseTTMLString(
  str : string,
  timeOffset : number
) : IParsedTTMLCue[] {
  const cues : IParsedTTMLCue[] = [];
  const xml = new DOMParser().parseFromString(str, "text/xml");

  if (xml !== null && xml !== undefined) {
    const tts = xml.getElementsByTagName("tt");
    let tt: Element = tts[0];
    if (tt === undefined) {
      // EBU-TT sometimes namespaces tt, by "tt:"
      // Just catch all namespaces to play it safe
      const namespacedTT = xml.getElementsByTagNameNS("*", "tt");
      tt = namespacedTT[0];
      if (tt === undefined) {
        throw new Error("invalid XML");
      }
    }

    const body = getBodyNode(tt);
    const styleNodes = getStyleNodes(tt);
    const regionNodes = getRegionNodes(tt);
    const paragraphNodes = getTextNodes(tt);
    const ttParams = getParameters(tt);

    // construct idStyles array based on the xml as an optimization
    const idStyles : IStyleObject[]  = [];
    for (let i = 0; i <= styleNodes.length - 1; i++) {
      const styleNode = styleNodes[i];
      if (styleNode instanceof Element) {
        const styleID = styleNode.getAttribute("xml:id");
        if (styleID !== null) {
          const subStyles = styleNode.getAttribute("style");
          const extendsStyles = subStyles === null ? [] :
                                                     subStyles.split(" ");
          idStyles.push({ id: styleID,
                          style: getStylingFromElement(styleNode),
                          extendsStyles });
        }
      }
    }

    resolveStylesInheritance(idStyles);

    // construct regionStyles array based on the xml as an optimization
    const regionStyles : IStyleObject[] = [];
    for (let i = 0; i <= regionNodes.length - 1; i++) {
      const regionNode = regionNodes[i];
      if (regionNode instanceof Element) {
        const regionID = regionNode.getAttribute("xml:id");
        if (regionID !== null) {
          let regionStyle = getStylingFromElement(regionNode);
          const associatedStyleID = regionNode.getAttribute("style");
          if (isNonEmptyString(associatedStyleID)) {
            const style = arrayFind(idStyles, (x) => x.id === associatedStyleID);
            if (style !== undefined) {
              regionStyle = objectAssign({}, style.style, regionStyle);
            }
          }
          regionStyles.push({ id: regionID,
                              style: regionStyle,

                              // already handled
                              extendsStyles: [] });
        }
      }
    }

    // Computing the style takes a lot of ressources.
    // To avoid too much re-computation, let's compute the body style right
    // now and do the rest progressively.

    // TODO Compute corresponding CSS style here (as soon as we now the TTML
    // style) to speed up the process even more.
    const bodyStyle = getStylingAttributes(
      STYLE_ATTRIBUTES, body !== null ? [body] : [], idStyles, regionStyles);

    const bodySpaceAttribute = body !== null ? body.getAttribute("xml:space") :
                                               undefined;
    const shouldTrimWhiteSpaceOnBody = bodySpaceAttribute === "default" ||
                                       ttParams.spaceStyle === "default";

    for (let i = 0; i < paragraphNodes.length; i++) {
      const paragraph = paragraphNodes[i];
      if (paragraph instanceof Element) {
        const divs = getParentDivElements(paragraph);
        const paragraphStyle = objectAssign({},
                                            bodyStyle,
                                            getStylingAttributes(STYLE_ATTRIBUTES,
                                                                 [paragraph,
                                                                  ...divs],
                                                                 idStyles,
                                                                 regionStyles));

        const paragraphSpaceAttribute = paragraph.getAttribute("xml:space");
        const shouldTrimWhiteSpace =
          isNonEmptyString(paragraphSpaceAttribute) ?
            paragraphSpaceAttribute === "default" :
            shouldTrimWhiteSpaceOnBody;

        const cue = { paragraph,
                      timeOffset,
                      idStyles,
                      regionStyles,
                      body,
                      paragraphStyle,
                      ttParams,
                      shouldTrimWhiteSpace };

        if (cue !== null) {
          cues.push(cue);
        }
      }
    }
  }
  return cues;
}
