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

import { makeCue } from "../../../compat";
import assert from "../../../utils/assert";

const HTML_ENTITIES = /&#([0-9]+);/g;
const BR = /<br>/gi;
const STYLE = /<style[^>]*>([\s\S]*?)<\/style[^>]*>/i;
const PARAG = /\s*<p class=([^>]+)>(.*)/i;
const START = /<sync[^>]+?start="?([0-9]*)"?[^0-9]/i;

interface ISubs {
  start : number;
  end? : number;
  text : string;
}

/**
 * Creates an array of VTTCue/TextTrackCue from a given array of cue objects.
 * @param {Array.<Object>} cuesArray - Objects containing the start, end and
 * text.
 * @returns {Array.<VTTCue>}
 */
function createCuesFromArray(cuesArray : ISubs[]) : Array<TextTrackCue|VTTCue> {
  const nativeCues : Array<TextTrackCue|VTTCue> = [];
  for (let i = 0; i < cuesArray.length; i++) {
    const { start, end, text } = cuesArray[i];
    if (text && end != null) {
      const cue = makeCue(start, end, text);
      if (cue != null) {
        nativeCues.push(cue);
      }
    }
  }
  return nativeCues;
}

/**
 * Returns classnames for every languages.
 * @param {string} str
 * @returns {Object}
 */
function getClassNameByLang(str : string) : IDictionary<string> {
  const ruleRe = /\.(\S+)\s*{([^}]*)}/gi;
  const langs : { [lang : string] : string } = {};
  let m : RegExpExecArray|null;
  while ((m = ruleRe.exec(str))) {
    const name = m[1];
    const lang = getCSSProperty(m[2], "lang");
    if (name != null && lang != null) {
      langs[lang] = name;
    }
  }
  return langs;
}

/**
 * @param {string} str - entire CSS rule
 * @param {string} name - name of the property
 * @returns {string|null} - value of the property. Null if not found.
 */
function getCSSProperty(str : string, name : string) : string|null {
  const matches = str.match(new RegExp("\\s*" + name + ":\\s*(\\S+);", "i"));
  return matches ? matches[1] : null;
}

/**
 * Decode HMTL formatting into a string.
 * @param {string} text
 * @returns {string}
 */
function decodeEntities(text : string) : string {
  return text
    .replace(BR, "\n")
    .replace(HTML_ENTITIES, (_, $1) => String.fromCharCode($1));
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
 * @returns {Array.<VTTCue|TextTrackCue>}
 */
function parseSami(
  smi : string,
  timeOffset : number,
  lang : string
) : Array<TextTrackCue|VTTCue> {
  const syncOpen = /<sync[ >]/ig;
  const syncClose = /<sync[ >]|<\/body>/ig;

  const subs : ISubs[] = [];

  const styleMatches = smi.match(STYLE);
  const css = styleMatches ? styleMatches[1] : "";
  let up;
  let to = syncClose.exec(smi);

  const langs = getClassNameByLang(css);
  const klass = langs[lang];

  assert(klass, `sami: could not find lang ${lang} in CSS`);

  for (;;) {
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

    appendToSubs(str.split("\n"), start / 1000);
  }

  return createCuesFromArray(subs);

  function appendToSubs(lines : string[], start : number) {
    let i = lines.length;
    let m;
    while (--i >= 0) {
      m = lines[i].match(PARAG);
      if (!m) {
        continue;
      }

      const [, kl, txt] = m;

      if (klass !== kl) {
        continue;
      }

      if (txt === "&nbsp;") {
        subs[subs.length - 1].end = start;
      } else {
        subs.push({
          text: decodeEntities(txt),
          start: start + timeOffset,
        });
      }
    }
  }
}

export default parseSami;
