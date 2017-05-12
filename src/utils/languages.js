const MATCH_LEVELS = {
  PERFECT_MATCH: 0,
  BASE_LANG_MATCH: 1,
  OTHER_SUBLANG_MATCH: 2,
};

const HIGHER_MATCH_LEVEL = MATCH_LEVELS.PERFECT_MATCH;
const LOSER_MATCH_LEVEL = MATCH_LEVELS.OTHER_SUBLANG_MATCH;

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

function findBetterMatchIndex(langs, lang) {
  if (!lang) {
    return -1;
  }

  lang = normalize(lang);

  let level = HIGHER_MATCH_LEVEL;
  for (; level <= LOSER_MATCH_LEVEL; level++) {
    for (let i = 0; i < langs.length; i++) {
      if (match(normalize(langs[i]), lang, level)) {
        return i;
      }
    }
  }

  return -1;
}

function normalize(lang) {
  if (lang === null || lang === "") {
    return "";
  }
  const fields = (""+lang).toLowerCase().split("-");
  const base = fields[0];
  const norm = normalizeBase(base);
  if (norm) {
    fields[0] = norm;
  }
  return fields.join("-");
}

function normalizeBase(base) {
  let result;
  if (base.length === 2) {
    result = ISO_MAP_2_3[base];
  }
  if (base.length === 3) {
    result = ISO_MAP_3_3[base];
  }
  return result || base;
}

const ISO_MAP_2_3 = {
  "aa": "aar", "ab": "abk", "ae": "ave", "af": "afr", "ak": "aka", "am": "amh", "an": "arg", "ar": "ara",
  "as": "asm", "av": "ava", "ay": "aym", "az": "aze", "ba": "bak", "be": "bel", "bg": "bul", "bh": "bih",
  "bi": "bis", "bm": "bam", "bn": "ben", "bo": "bod", "br": "bre", "bs": "bos", "ca": "cat", "ce": "che",
  "ch": "cha", "co": "cos", "cr": "cre", "cs": "ces", "cu": "chu", "cv": "chv", "cy": "cym", "da": "dan",
  "de": "deu", "dv": "div", "dz": "dzo", "ee": "ewe", "el": "ell", "en": "eng", "eo": "epo", "es": "spa",
  "et": "est", "eu": "baq", "fa": "fas", "ff": "ful", "fi": "fin", "fj": "fij", "fo": "fao", "fr": "fre",
  "fy": "fry", "ga": "gle", "gd": "gla", "gl": "glg", "gn": "grn", "gu": "guj", "gv": "glv", "ha": "hau",
  "he": "heb", "hi": "hin", "ho": "hmo", "hr": "hrv", "ht": "hat", "hu": "hun", "hy": "arm", "hz": "her",
  "ia": "ina", "id": "ind", "ie": "ile", "ig": "ibo", "ii": "iii", "ik": "ipk", "io": "ido", "is": "ice",
  "it": "ita", "iu": "iku", "ja": "jpn", "jv": "jav", "ka": "geo", "kg": "kon", "ki": "kik", "kj": "kua",
  "kk": "kaz", "kl": "kal", "km": "khm", "kn": "kan", "ko": "kor", "kr": "kau", "ks": "kas", "ku": "kur",
  "kv": "kom", "kw": "cor", "ky": "kir", "la": "lat", "lb": "ltz", "lg": "lug", "li": "lim", "ln": "lin",
  "lo": "lao", "lt": "lit", "lu": "lub", "lv": "lav", "mg": "mlg", "mh": "mah", "mi": "mao", "mk": "mac",
  "ml": "mal", "mn": "mon", "mr": "mar", "ms": "may", "mt": "mlt", "my": "bur", "na": "nau", "nb": "nob",
  "nd": "nde", "ne": "nep", "ng": "ndo", "nl": "dut", "nn": "nno", "no": "nor", "nr": "nbl", "nv": "nav",
  "ny": "nya", "oc": "oci", "oj": "oji", "om": "orm", "or": "ori", "os": "oss", "pa": "pan", "pi": "pli",
  "pl": "pol", "ps": "pus", "pt": "por", "qu": "que", "rm": "roh", "rn": "run", "ro": "ron", "ru": "rus",
  "rw": "kin", "sa": "san", "sc": "srd", "sd": "snd", "se": "sme", "sg": "sag", "si": "sin", "sk": "slk",
  "sl": "slv", "sm": "smo", "sn": "sna", "so": "som", "sq": "alb", "sr": "srp", "ss": "ssw", "st": "sot",
  "su": "sun", "sv": "swe", "sw": "swa", "ta": "tam", "te": "tel", "tg": "tgk", "th": "tha", "ti": "tir",
  "tk": "tuk", "tl": "tgl", "tn": "tsn", "to": "ton", "tr": "tur", "ts": "tso", "tt": "tat", "tw": "twi",
  "ty": "tah", "ug": "uig", "uk": "ukr", "ur": "urd", "uz": "uzb", "ve": "ven", "vi": "vie", "vo": "vol",
  "wa": "wln", "wo": "wol", "xh": "xho", "yi": "yid", "yo": "yor", "za": "zha", "zh": "chi", "zu": "zul",
};

const ISO_MAP_3_3 = {
  "tib": "bod", "cze": "ces", "wel": "cym", "ger": "deu", "gre": "ell", "eus": "baq", "per": "fas",
  "fra": "fre", "hye": "arm", "isl": "ice", "kat": "geo", "mri": "mao", "mkd": "mac", "msa": "may",
  "mya": "bur", "nld": "dut", "rum": "ron", "slo": "slk", "sqi": "alb", "zho": "chi",
};

module.exports = {
  match,
  normalize,
  findBetterMatchIndex,
};
