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

/**
 * Translate ISO 639-1 language codes into ISO 639-3 ones.
 */
const ISO_MAP_1_TO_3 : { [ lang : string ] : string } = {
  aa: "aar", // Afar
  ab: "abk", // Abkhazian
  ae: "ave", // Avestan
  af: "afr", // Afrikaans
  ak: "aka", // Akan
  am: "amh", // Amharic
  an: "arg", // Aragonese
  ar: "ara", // Arabic
  as: "asm", // Assamese
  av: "ava", // Avaric
  ay: "aym", // Aymara
  az: "aze", // Azerbaijani
  ba: "bak", // Bashkir
  be: "bel", // Belarusian
  bg: "bul", // Bulgarian
  bi: "bis", // Bislama
  bm: "bam", // Bambara
  bn: "ben", // Bengali
  bo: "bod", // Tibetan
  br: "bre", // Breton
  bs: "bos", // Bosnian
  ca: "cat", // Catalan, Valencian
  ce: "che", // Chechen
  ch: "cha", // Chamorro
  co: "cos", // Corsican
  cr: "cre", // Cree
  cs: "ces", // Czech
  cu: "chu", // Church Slavic, Church Slavonic, Old Church Slavonic,
             // Old Slavonic, Old Bulgarian
  cv: "chv", // Chuvash
  cy: "cym", // Welsh
  da: "dan", // Danish
  de: "deu", // German
  dv: "div", // Divehi, Dhivehi, Maldivian
  dz: "dzo", // Dzongkha
  ee: "ewe", // Ewe
  el: "ell", // Greek (modern)
  en: "eng", // English
  eo: "epo", // Esperanto
  es: "spa", // Spanish, Castilian
  et: "est", // Estonian
  eu: "eus", // Basque
  fa: "fas", // Persian
  ff: "ful", // Fulah
  fi: "fin", // Finnish
  fj: "fij", // Fijian
  fo: "fao", // Faroese
  fr: "fra", // French
  fy: "fry", // Western Frisian
  ga: "gle", // Irish
  gd: "gla", // Gaelic, Scottish Gaelic
  gl: "glg", // Galician
  gn: "grn", // Guaraní
  gu: "guj", // Gujarati
  gv: "glv", // Manx
  ha: "hau", // Hausa
  he: "heb", // Hebrew (modern)
  hi: "hin", // Hindi
  ho: "hmo", // Hiri Motu
  hr: "hrv", // Croatian
  ht: "hat", // Haitian, Haitian Creole
  hu: "hun", // Hungarian
  hy: "hye", // Armenian
  hz: "her", // Herero
  ia: "ina", // Interlingua
  id: "ind", // Indonesian
  ie: "ile", // Interlingue
  ig: "ibo", // Igbo
  ii: "iii", // Sichuan Yi, Nuosu
  ik: "ipk", // Inupiaq
  io: "ido", // Ido
  is: "isl", // Icelandic
  it: "ita", // Italian
  iu: "iku", // Inuktitut
  ja: "jpn", // Japanese
  jv: "jav", // Javanese
  ka: "kat", // Georgian
  kg: "kon", // Kongo
  ki: "kik", // Kikuyu, Gikuyu
  kj: "kua", // Kuanyama, Kwanyama
  kk: "kaz", // Kazakh
  kl: "kal", // Kalaallisut, Greenlandic
  km: "khm", // Central Khmer
  kn: "kan", // Kannada
  ko: "kor", // Korean
  kr: "kau", // Kanuri
  ks: "kas", // Kashmiri
  ku: "kur", // Kurdish
  kv: "kom", // Komi
  kw: "cor", // Cornish
  ky: "kir", // Kirghiz, Kyrgyz
  la: "lat", // Latin
  lb: "ltz", // Luxembourgish, Letzeburgesch
  lg: "lug", // Ganda
  li: "lim", // Limburgan, Limburger, Limburgish
  ln: "lin", // Lingala
  lo: "lao", // Lao
  lt: "lit", // Lithuanian
  lu: "lub", // Luba-Katanga
  lv: "lav", // Latvian
  mg: "mlg", // Malagasy
  mh: "mah", // Marshallese
  mi: "mri", // Maori
  mk: "mkd", // Macedonian
  ml: "mal", // Malayalam
  mn: "mon", // Mongolian
  mr: "mar", // Marathi
  ms: "msa", // Malay
  mt: "mlt", // Maltese
  my: "mya", // Burmese
  na: "nau", // Nauru
  nb: "nob", // Norwegian Bokmål
  nd: "nde", // North Ndebele
  ne: "nep", // Nepali
  ng: "ndo", // Ndonga
  nl: "nld", // Dutch, Flemish
  nn: "nno", // Norwegian Nynorsk
  no: "nor", // Norwegian
  nr: "nbl", // South Ndebele
  nv: "nav", // Navajo, Navaho
  ny: "nya", // Chichewa, Chewa, Nyanja
  oc: "oci", // Occitan
  oj: "oji", // Ojibwa
  om: "orm", // Oromo
  or: "ori", // Oriya
  os: "oss", // Ossetian, Ossetic
  pa: "pan", // Panjabi, Punjabi
  pi: "pli", // Pali
  pl: "pol", // Polish
  ps: "pus", // Pashto, Pushto
  pt: "por", // Portuguese
  qu: "que", // Quechua
  rm: "roh", // Romansh
  rn: "run", // Rundi
  ro: "ron", // Romanian, Moldavian, Moldovan
  ru: "rus", // Russian
  rw: "kin", // Kinyarwanda
  sa: "san", // Sanskrit
  sc: "srd", // Sardinian
  sd: "snd", // Sindhi
  se: "sme", // Northern Sami
  sg: "sag", // Sango
  si: "sin", // Sinhala, Sinhalese
  sk: "slk", // Slovak
  sl: "slv", // Slovenian
  sm: "smo", // Samoan
  sn: "sna", // Shona
  so: "som", // Somali
  sq: "sqi", // Albanian
  sr: "srp", // Serbian
  ss: "ssw", // Swati
  st: "sot", // Southern Sotho
  su: "sun", // Sundanese
  sv: "swe", // Swedish
  sw: "swa", // Swahili
  ta: "tam", // Tamil
  te: "tel", // Telugu
  tg: "tgk", // Tajik
  th: "tha", // Thai
  ti: "tir", // Tigrinya
  tk: "tuk", // Turkmen
  tl: "tgl", // Tagalog
  tn: "tsn", // Tswana
  to: "ton", // Tonga (Tonga Islands)
  tr: "tur", // Turkish
  ts: "tso", // Tsonga
  tt: "tat", // Tatar
  tw: "twi", // Twi
  ty: "tah", // Tahitian
  ug: "uig", // Uighur, Uyghur
  uk: "ukr", // Ukrainian
  ur: "urd", // Urdu
  uz: "uzb", // Uzbek
  ve: "ven", // Venda
  vi: "vie", // Vietnamese
  vo: "vol", // Volapük
  wa: "wln", // Walloon
  wo: "wol", // Wolof
  xh: "xho", // Xhosa
  yi: "yid", // Yiddish
  yo: "yor", // Yoruba
  za: "zha", // Zhuang, Chuang
  zh: "zho", // Chinese
  zu: "zul", // Zulu
};

export default ISO_MAP_1_TO_3;
