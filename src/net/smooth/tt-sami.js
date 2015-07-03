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

var _ = require("canal-js-utils/misc");
var assert = require("canal-js-utils/assert");
var HTML_ENTITIES = /&#([0-9]+);/g;
var BR = /<br>/gi;
var STYLE = /<style[^>]*>([\s\S]*?)<\/style[^>]*>/i;
var PARAG = /\s*<p class=([^>]+)>(.*)/i;
var START = /<sync[^>]+?start="?([0-9]*)"?[^0-9]/i;

// Really basic CSS parsers using regular-expressions.
function rulesCss(str) {
  var ruleRe = /\.(\S+)\s*{([^}]*)}/gi;
  var m, langs = {};
  while ((m = ruleRe.exec(str))) {
    var name = m[1];
    var lang = propCss(m[2], "lang");
    if (name && lang) {
      langs[lang] = name;
    }
  }
  return langs;
}

function propCss(str, name) {
  return str.match(new RegExp("\\s*" + name + ":\\s*(\\S+);", "i"))[1];
}

function decodeEntities(text) {
  return text
    .replace(BR, "\n")
    .replace(HTML_ENTITIES, ($0, $1) => String.fromCharCode($1));
}

// Because sami is not really html... we have to use
// some kind of regular expressions to parse it...
// the cthulhu way :)
// The specification being quite clunky, this parser
// may not work for every sami input.
function parseSami(smi, lang) {
  var syncOp = /<sync[ >]/ig;
  var syncCl = /<sync[ >]|<\/body>/ig;

  var subs = [];
  var [, css] = smi.match(STYLE);
  var up, to = syncCl.exec(smi);

  var langs = rulesCss(css);
  var klass = langs[lang];

  assert(klass, `sami: could not find lang ${lang} in CSS`);

  while (true) {
    up = syncOp.exec(smi);
    to = syncCl.exec(smi);
    if (!up && !to) break;
    if (!up || !to || up.index >= to.index)
      throw new Error("parse error");

    var str = smi.slice(up.index, to.index);
    var tim = str.match(START);
    if (!tim)
      throw new Error("parse error: sync time attribute");

    var start = +tim[1];
    if (isNaN(start))
      throw new Error("parse error: sync time attribute NaN");

    appendSub(subs, str.split("\n"), start / 1000);
  }

  return subs;

  function appendSub(subs, lines, start) {
    var i = lines.length, m;
    while(--i >= 0) {
      m = lines[i].match(PARAG); if (!m) continue;
      var [, kl, txt] = m;

      if (klass !== kl)
        continue;

      if (txt === "&nbsp;") {
        _.last(subs).end = start;
      } else {
        subs.push({ text: decodeEntities(txt), start });
      }
    }
  }
}

module.exports = { parseSami };
