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
 * Translate ISO 639-2 synonyms to their ISO 639-3 counterparts.
 */
const ISO_MAP_2_TO_3 : { [ lang : string ] : string } = {
  alb: "sqi", // Albanian
  arm: "hye", // Armenian
  baq: "eus", // Basque
  bur: "mya", // Burmese
  chi: "zho", // Chinese
  cze: "ces", // Czech
  dut: "nld", // Dutch; Flemish
  fre: "fra", // French
  geo: "kat", // Georgian
  ger: "deu", // German
  gre: "ell", // Modern Greek (1453–)
  ice: "isl", // Icelandic
  mac: "mkd", // Macedonian
  mao: "mri", // Maori
  may: "msa", // Malay
  per: "fas", // Persian
  slo: "slk", // Slovak
  rum: "ron", // Moldovan
  tib: "bod", // Tibetan
  wel: "cym", // Welsh
};

export default ISO_MAP_2_TO_3;
