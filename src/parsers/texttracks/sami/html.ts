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

// __VERY__ simple SAMI parser, based on ugly-but-working REGEXP:
//   - the text, start and end times are correctly parsed.
//   - only text for the given language is parsed.
//   - only the CSS style associated to the P element is set.
//   - we should be safe for any XSS.

// The language indicated to the parser should be present in the CSS and the
// corresponding Class should be on the P elements. If we fail to find the
// language in a "lang" property of a CSS class, the parser will throw.

/**
 * /!\ This file is feature-switchable.
 * It always should be imported through the `features` object.
 */

import isNonEmptyString from "../../../utils/is_non_empty_string";
import { IHTMLCue } from "../types";

const HTML_ENTITIES = /&#([0-9]+);/g;
const BR = /<br>/gi;
const STYLE = /<style[^>]*>([\s\S]*?)<\/style[^>]*>/i;
const PARAG = /\s*<p (?:class=([^>]+))?>(.*)/i;
const START = /<sync[^>]+?start="?([0-9]*)"?[^0-9]/i;

/**
 * Returns classnames for every languages.
 * @param {string} str
 * @returns {Object}
 */
function getClassNameByLang(str : string) : Partial<Record<string, string>> {
  const ruleRe = /\.(\S+)\s*{([^}]*)}/gi;
  const langs : { [lang : string ] : string } = {};
  let m = ruleRe.exec(str);
  while (m !== null) {
    const name = m[1];
    const lang = getCSSProperty(m[2], "lang");
    if (name != null && lang != null) {
      langs[lang] = name;
    }
    m = ruleRe.exec(str);
  }
  return langs;
}

/**
 * Returns the rules defined for the P element.
 * Empty string if not found.
 * @param {string} str - The entire styling part.
 * @returns {string}
 */
function getPCSSRules(str : string) : string {
  const pRuleRegex = /p\s*{([^}]*)}/gi;
  const rule = pRuleRegex.exec(str);
  if (rule === null) {
    return "";
  }
  return rule[1];
}

/**
 * @param {string} str - entire CSS rule
 * @param {string} name - name of the property
 * @returns {string|null} - value of the property. Null if not found.
 */
function getCSSProperty(str : string, name : string) : string|null {
  const matches = str.match(new RegExp("\\s*" + name + ":\\s*(\\S+);", "i"));
  return Array.isArray(matches) ? matches[1] :
                                  null;
}

/**
 * @param {string} text
 * @returns {string}
 */
function decodeEntities(text : string) : string {
  return text
    /* tslint:disable no-unsafe-any */
    .replace(HTML_ENTITIES, (_, $1) => String.fromCharCode($1));
    /* tslint:enable no-unsafe-any */
}

/**
 * Because sami is not really html... we have to use
 * some kind of regular expressions to parse it...
 * the cthulhu way :)
 * The specification being quite clunky, this parser
 * may not work for every sami input.
 *
 * @param {string} smi
 * @param {Number} timeOffset
 * @param {string} lang
 */
function parseSami(smi : string, timeOffset : number, lang? : string) : IHTMLCue[] {
  const syncOpen = /<sync[ >]/ig;
  const syncClose = /<sync[ >]|<\/body>/ig;

  const subs : IHTMLCue[] = [];

  const styleMatches = smi.match(STYLE);
  const css = Array.isArray(styleMatches) ? styleMatches[1] :
                                            "";
  let up;
  let to;

  // FIXME Is that wanted?
  // previously written as let to = SyncClose.exec(smi); but never used
  syncClose.exec(smi);

  const langs = getClassNameByLang(css);
  const pCSS = getPCSSRules(css);

  let klass : string | undefined;
  if (isNonEmptyString(lang)) {
    klass = langs[lang];
    if (klass === undefined) {
      throw new Error(`sami: could not find lang ${lang} in CSS`);
    }
  }

  while (true) {
    up = syncOpen.exec(smi);
    to = syncClose.exec(smi);
    if (up === null && to === null) {
      break;
    }
    if (up === null || to === null || up.index >= to.index) {
      throw new Error("parse error");
    }

    const str = smi.slice(up.index, to.index);
    const tim = str.match(START);
    if (!Array.isArray(tim)) {
      throw new Error("parse error (sync time attribute)");
    }

    const start = +tim[1];
    if (isNaN(start)) {
      throw new Error("parse error (sync time attribute NaN)");
    }

    appendToSubs(str.split("\n"), start / 1000);
  }

  return subs;

  function appendToSubs(lines : string[], start : number) {
    let i = lines.length;
    while (--i >= 0) {
      const paragraphInfos = lines[i].match(PARAG);
      if (!Array.isArray(paragraphInfos)) {
        continue;
      }

      const [, className, txt] = paragraphInfos;

      if (klass !== className) {
        continue;
      }

      if (txt === "&nbsp;") {
        subs[subs.length - 1].end = start;
      } else {
        const wrapperEl = document.createElement("DIV");
        wrapperEl.className = "rxp-texttrack-region";

        const divEl = document.createElement("DIV");
        divEl.className = "rxp-texttrack-div";
        divEl.style.position = "absolute";
        divEl.style.bottom = "0";
        divEl.style.width = "100%";
        divEl.style.color = "#fff";
        divEl.style.textShadow = "-1px -1px 0 #000," +
                                 "1px -1px 0 #000," +
                                 "-1px 1px 0 #000," +
                                 "1px 1px 0 #000";

        const pEl = document.createElement("div");
        pEl.className = "rxp-texttrack-p";
        if (isNonEmptyString(pCSS)) {
          pEl.style.cssText = pCSS;
        }

        const textEls = txt.split(BR);
        for (let j = 0; j < textEls.length; j++) {
          if (j !== 0) {
            pEl.appendChild(document.createElement("BR"));
          }
          const spanEl = document.createElement("SPAN");
          spanEl.className = "rxp-texttrack-span";
          spanEl.textContent = decodeEntities(textEls[j]);

          pEl.appendChild(spanEl);
        }
        divEl.appendChild(pEl);
        wrapperEl.appendChild(divEl);

        subs.push({ element: wrapperEl,
                    start: start + timeOffset,
                    end: -1, /* Will be updated on a following iteration */ });
      }
    }
  }
}

export default parseSami;
