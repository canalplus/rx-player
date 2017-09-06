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

const MATCH_LEVELS = {
  PERFECT_MATCH: 0,
  BASE_LANG_MATCH: 1,
  OTHER_SUBLANG_MATCH: 2,
};

const HIGHER_MATCH_LEVEL = MATCH_LEVELS.PERFECT_MATCH;
const LOSER_MATCH_LEVEL = MATCH_LEVELS.OTHER_SUBLANG_MATCH;

/**
 * Normalize text track Object from a user given input.
 * @param {Object|string} _language
 * @returns {Object}
 */
function normalizeTextTrack(_language) {
  if (_language != null) {
    let language, closedCaption;
    if (typeof _language === "string") {
      language = _language;
      closedCaption = false;
    } else {
      language = normalize(_language.language);
      closedCaption = !!_language.closedCaption;
    }

    return { language, closedCaption };
  }
}

/**
 * Normalize audio track Object from a user given input.
 * @param {Object|string} _language
 * @returns {Object}
 */
function normalizeAudioTrack(_language) {
  if (_language != null) {
    let language, audioDescription;
    if (typeof _language === "string") {
      language = _language;
      audioDescription = false;
    } else {
      language = normalize(_language.language);
      audioDescription = !!_language.audioDescription;
    }

    return { language, audioDescription };
  }
}

function match(lang1, lang2, level) {
  // langs should be normalized
  if (lang1 === lang2) {
    return true;
  }

  const [base1] = lang1.split("-");
  const [base2] = lang2.split("-");

  if (level >= MATCH_LEVELS.BASE_LANG_MATCH &&
      lang1 === base2) {
    return true;
  }

  if (level >= MATCH_LEVELS.OTHER_SUBLANG_MATCH &&
      base1 === base2) {
    return true;
  }

  return false;
}

function findBetterMatchIndex(langs, _language) {
  if (!_language) {
    return -1;
  }

  _language = normalize(_language);

  let level = HIGHER_MATCH_LEVEL;
  for (; level <= LOSER_MATCH_LEVEL; level++) {
    for (let i = 0; i < langs.length; i++) {
      if (match(normalize(langs[i]), _language, level)) {
        return i;
      }
    }
  }

  return -1;
}

/**
 * Normalize language given.
 * Basically:
 *   - converts it to lowercase.
 *   - normalize "base" (what is before the possible first "-") to an ISO639-2
 *     compatible string.
 * @param {string} _language
 * @returns {string}
 */
function normalize(_language) {
  if (_language == null || _language === "") {
    return "";
  }
  const fields = (""+_language).toLowerCase().split("-");
  const base = fields[0];
  const normalizedBase = normalizeBase(base);
  if (normalizedBase) {
    fields[0] = normalizedBase;
  }
  return fields.join("-");
}

/**
 * Normalize language into an ISO639-2 format.
 * TODO use ISO639-3 instead? They do not have synonyms.
 * @param {string} base
 * @returns {string}
 */
function normalizeBase(base) {
  let result;
  if (base.length === 2) {
    result = ISO_MAP_1_2[base];
  }
  else if (base.length === 3) {
    result = ISO_MAP_2_2[base];
  }
  return result || base;
}

/**
 * Link ISO639-1 languages into their ISO639-2 three-letters counterparts.
 * TODO use ISO639-3 instead? They do not have synonyms.
 */
const ISO_MAP_1_2 = {
  "aa": "aar", "ab": "abk", "ae": "ave", "af": "afr", "ak": "aka", "am": "amh",
  "an": "arg", "ar": "ara", "as": "asm", "av": "ava", "ay": "aym", "az": "aze",
  "ba": "bak", "be": "bel", "bg": "bul", "bh": "bih", "bi": "bis", "bm": "bam",
  "bn": "ben", "bo": "bod", "br": "bre", "bs": "bos", "ca": "cat", "ce": "che",
  "ch": "cha", "co": "cos", "cr": "cre", "cs": "ces", "cu": "chu", "cv": "chv",
  "cy": "cym", "da": "dan", "de": "deu", "dv": "div", "dz": "dzo", "ee": "ewe",
  "el": "ell", "en": "eng", "eo": "epo", "es": "spa", "et": "est", "eu": "baq",
  "fa": "fas", "ff": "ful", "fi": "fin", "fj": "fij", "fo": "fao", "fr": "fre",
  "fy": "fry", "ga": "gle", "gd": "gla", "gl": "glg", "gn": "grn", "gu": "guj",
  "gv": "glv", "ha": "hau", "he": "heb", "hi": "hin", "ho": "hmo", "hr": "hrv",
  "ht": "hat", "hu": "hun", "hy": "arm", "hz": "her", "ia": "ina", "id": "ind",
  "ie": "ile", "ig": "ibo", "ii": "iii", "ik": "ipk", "io": "ido", "is": "ice",
  "it": "ita", "iu": "iku", "ja": "jpn", "jv": "jav", "ka": "geo", "kg": "kon",
  "ki": "kik", "kj": "kua", "kk": "kaz", "kl": "kal", "km": "khm", "kn": "kan",
  "ko": "kor", "kr": "kau", "ks": "kas", "ku": "kur", "kv": "kom", "kw": "cor",
  "ky": "kir", "la": "lat", "lb": "ltz", "lg": "lug", "li": "lim", "ln": "lin",
  "lo": "lao", "lt": "lit", "lu": "lub", "lv": "lav", "mg": "mlg", "mh": "mah",
  "mi": "mao", "mk": "mac", "ml": "mal", "mn": "mon", "mr": "mar", "ms": "may",
  "mt": "mlt", "my": "bur", "na": "nau", "nb": "nob", "nd": "nde", "ne": "nep",
  "ng": "ndo", "nl": "dut", "nn": "nno", "no": "nor", "nr": "nbl", "nv": "nav",
  "ny": "nya", "oc": "oci", "oj": "oji", "om": "orm", "or": "ori", "os": "oss",
  "pa": "pan", "pi": "pli", "pl": "pol", "ps": "pus", "pt": "por", "qu": "que",
  "rm": "roh", "rn": "run", "ro": "ron", "ru": "rus", "rw": "kin", "sa": "san",
  "sc": "srd", "sd": "snd", "se": "sme", "sg": "sag", "si": "sin", "sk": "slk",
  "sl": "slv", "sm": "smo", "sn": "sna", "so": "som", "sq": "alb", "sr": "srp",
  "ss": "ssw", "st": "sot", "su": "sun", "sv": "swe", "sw": "swa", "ta": "tam",
  "te": "tel", "tg": "tgk", "th": "tha", "ti": "tir", "tk": "tuk", "tl": "tgl",
  "tn": "tsn", "to": "ton", "tr": "tur", "ts": "tso", "tt": "tat", "tw": "twi",
  "ty": "tah", "ug": "uig", "uk": "ukr", "ur": "urd", "uz": "uzb", "ve": "ven",
  "vi": "vie", "vo": "vol", "wa": "wln", "wo": "wol", "xh": "xho", "yi": "yid",
  "yo": "yor", "za": "zha", "zh": "chi", "zu": "zul",
};

/**
 * Link synonymous ISO639-2 three-letters languages to normalize them.
 * TODO use ISO639-3 instead? They do not have synonyms.
 */
const ISO_MAP_2_2 = {
  "tib": "bod", "cze": "ces", "wel": "cym", "ger": "deu", "gre": "ell",
  "eus": "baq", "per": "fas", "fra": "fre", "hye": "arm", "isl": "ice",
  "kat": "geo", "mri": "mao", "mkd": "mac", "msa": "may", "mya": "bur",
  "nld": "dut", "rum": "ron", "slo": "slk", "sqi": "alb", "zho": "chi",
};

export {
  match,
  normalize,
  normalizeAudioTrack,
  normalizeTextTrack,
  findBetterMatchIndex,
};
