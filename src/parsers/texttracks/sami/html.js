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

import assert from "../../../utils/assert";

const HTML_ENTITIES = /&#([0-9]+);/g;
const BR = /<br>/gi;
const STYLE = /<style[^>]*>([\s\S]*?)<\/style[^>]*>/i;
const PARAG = /\s*<p class=([^>]+)>(.*)/i;
const START = /<sync[^>]+?start="?([0-9]*)"?[^0-9]/i;

// Really basic CSS parsers using regular-expressions.
function classCSSRules(str) {
  const ruleRe = /\.(\S+)\s*{([^}]*)}/gi;
  const langs = {};
  let m;
  while ((m = ruleRe.exec(str))) {
    const name = m[1];
    const lang = propCss(m[2], "lang");
    if (name && lang) {
      langs[lang] = name;
    }
  }
  return langs;
}

function pCSSRules(str) {
  const pRuleRegex = /p\s*{([^}]*)}/gi;
  const rule = pRuleRegex.exec(str);
  return rule[1];
}

function propCss(str, name) {
  return str.match(new RegExp("\\s*" + name + ":\\s*(\\S+);", "i"))[1];
}

function decodeEntities(text) {
  return text
    .replace(HTML_ENTITIES, ($0, $1) => String.fromCharCode($1));
}

/**
 * Because sami is not really html... we have to use
 * some kind of regular expressions to parse it...
 * the cthulhu way :)
 * The specification being quite clunky, this parser
 * may not work for every sami input.
 *
 * @param {string} smi
 * @param {string} lang
 */
function parseSami(smi, lang) {
  const syncOpen = /<sync[ >]/ig;
  const syncClose = /<sync[ >]|<\/body>/ig;

  const subs = [];
  const [, css] = smi.match(STYLE);
  let up, to = syncClose.exec(smi);

  const langs = classCSSRules(css);
  const pCSS = pCSSRules(css);
  const klass = langs[lang];

  assert(klass, `sami: could not find lang ${lang} in CSS`);

  for(;;) {
    up = syncOpen.exec(smi);
    to = syncClose.exec(smi);
    if (!up && !to) {
      break;
    }
    if (!up || !to || up.index >= to.index) {
      throw new Error("parse error");
    }

    const str = smi.slice(up.index, to.index);
    const tim = str.match(START);
    if (!tim) {
      throw new Error("parse error (sync time attribute)");
    }

    const start = +tim[1];
    if (isNaN(start)) {
      throw new Error("parse error (sync time attribute NaN)");
    }

    appendSub(subs, str.split("\n"), start / 1000);
  }

  return subs;

  function appendSub(subs, lines, start) {
    let i = lines.length;
    while(--i >= 0) {
      const paragraphInfos = lines[i].match(PARAG);
      if (!paragraphInfos) {
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
        divEl.style.bottom = 0;
        divEl.style.width = "100%";
        divEl.style.textShadow = "-1px -1px 0 #000," +
          "1px -1px 0 #000," +
          "-1px 1px 0 #000," +
          "1px 1px 0 #000";

        const pEl = document.createElement("div");
        pEl.className = "rxp-texttrack-p";
        if (pCSS) {
          pEl.style.cssText = pCSS;
        }

        const textEls = txt.split(BR);
        for (let j = 0; j < textEls.length; j++) {
          if (j) {
            pEl.appendChild(document.createElement("BR"));
          }
          const spanEl = document.createElement("SPAN");
          spanEl.className = "rxp-texttrack-span";
          spanEl.textContent = decodeEntities(textEls[j]);

          pEl.appendChild(spanEl);
        }
        divEl.appendChild(pEl);
        wrapperEl.appendChild(divEl);

        subs.push({ element: wrapperEl, start });
      }
    }
  }
}

export default parseSami;
