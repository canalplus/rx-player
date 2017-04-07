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

// XML-Schema
// <http://standards.iso.org/ittf/PubliclyAvailableStandards/MPEG-DASH_schema_files/DASH-MPD.xsd>

const assert = require("../../utils/assert");
const { normalize: normalizeLang } = require("../../utils/languages");

const iso8601Duration = /^P(([\d.]*)Y)?(([\d.]*)M)?(([\d.]*)D)?T?(([\d.]*)H)?(([\d.]*)M)?(([\d.]*)S)?/;
const rangeRe = /([0-9]+)-([0-9]+)/;
const frameRateRe = /([0-9]+)(\/([0-9]+))?/;

/**
 * Calculate the last time for the last video index, in s.
 * TODO(pierre): support more than juste timeline index type
 * @param {Object} index
 * @returns {Number}
 */
function calculateIndexLastLiveTimeReference(index) {
  if (index.indexType === "timeline") {
    const { ts, r, d } = index.timeline[index.timeline.length - 1];
    return ((ts + (r+1)*d) / index.timescale);
  }
  // By default (e.g. for templates), live Edge is right now
  return Date.now() / 1000;
}

/**
 * @param {Document} node - The Node content
 * @param {Object} [base] - Base object that will be enriched
 * @returns {Object}
 */
function feedAttributes(node, base) {
  const attrs = attributes[node.nodeName];

  assert(attrs, "no attributes for " + node.nodeName);

  const obj = base || {};
  for (let i = 0; i < attrs.length; i++) {
    const { k, fn, n, def } = attrs[i];
    if (node.hasAttribute(k)) {
      obj[n || k] = fn(node.getAttribute(k));
    } else if (def != null) {
      obj[n || k] = def;
    }
  }
  return obj;
}

/**
 * Parse MPD string attributes.
 * @param {string} str
 * @returns {string} - the same string
 */
function parseString(str) {
  return str;
}

/**
 * Parse MPD boolean attributes.
 * @param {string}
 * @returns {Boolean}
 */
function parseBoolean(str) {
  return str == "true";
}

/**
 * Parse some MPD attributes.
 * @param {string}
 * @returns {Boolean|Number}
 */
function parseIntOrBoolean(str) {
  if (str == "true") {
    return true;
  }
  if (str == "false") {
    return false;
  }
  return parseInt(str);
}

/**
 * Parse MPD date attributes.
 * @param {string}
 * @returns {Date}
 */
function parseDateTime(str) {
  return new Date(Date.parse(str));
}

/**
 * Parse MPD ISO8601 duration attributes into seconds.
 * @param {string}
 * @returns {Number}
 */
function parseDuration(date) {
  if (!date) {
    return 0;
  }

  const match = iso8601Duration.exec(date);
  assert(match, `${date} is not a valid ISO8601 duration`);

  return (
    parseFloat(match[2]  || 0) * 365 * 24 * 60 * 60 +
    parseFloat(match[4]  || 0) * 30 * 24 * 60 * 60 + // not precise +
    parseFloat(match[6]  || 0) * 24 * 60 * 60 +
    parseFloat(match[8]  || 0) * 60 * 60 +
    parseFloat(match[10] || 0) * 60 +
    parseFloat(match[12] || 0)
  );
}

/**
 * Parse MPD frame rate attributes.
 * -1 if the frameRate could not be parsed,
 * @param {string} str
 * @returns {Number}
 */
function parseFrameRate(str) {
  const match = frameRateRe.exec(str);
  if (!match) {
    return -1;
  }

  const nom = parseInt(match[1]) || 0;
  const den = parseInt(match[2]) || 0;
  return den > 0
    ? nom / den
    : nom;
}

/**
 * Parse MPD ratio attributes.
 * @param {string} str
 * @returns {string}
 */
function parseRatio(str) {
  return str;
}

/**
 * Parse MPD byterange attributes into arrays of two elements: the start and
 * the end.
 * @param {string} str
 * @returns {Array.<Number>}
 */
function parseByteRange(str) {
  const match = rangeRe.exec(str);
  if (!match) {
    return null;
  } else {
    return [+match[1], +match[2]];
  }
}

// @see attributes
const RepresentationBaseType = [
  { k: "profiles",          fn: parseString },
  { k: "width",             fn: parseInt },
  { k: "height",            fn: parseInt },
  { k: "frameRate",         fn: parseFrameRate },
  { k: "audioSamplingRate", fn: parseString },
  { k: "mimeType",          fn: parseString },
  { k: "segmentProfiles",   fn: parseString },
  { k: "codecs",            fn: parseString },
  { k: "maximumSAPPeriod",  fn: parseFloat },
  { k: "maxPlayoutRate",    fn: parseFloat },
  { k: "codingDependency",  fn: parseBoolean },
];

// @see attributes
const SegmentBaseType = [
  { k: "timescale",                fn: parseInt },
  { k: "presentationTimeOffset",   fn: parseFloat, def: 0 },
  { k: "indexRange",               fn: parseByteRange },
  { k: "indexRangeExact",          fn: parseBoolean },
  { k: "availabilityTimeOffset",   fn: parseFloat },
  { k: "availabilityTimeComplete", fn: parseBoolean },
];

// @see attributes
const MultipleSegmentBaseType = SegmentBaseType.concat([
  { k: "duration",    fn: parseInt },
  { k: "startNumber", fn: parseInt },
]);

/**
 * Object describing how a Dash MPD should be parsed automatically.
 *
 * Basically, immediate keys are the nodeName concerned.
 * They contain array of Objects, each concerning a unique node attributes.
 *
 * The keys these Objects have are as such:
 *
 *   - k {string}: the name of the node attribute
 *
 *   - fn {Function}: the function called to parse this attribute. It takes
 *     as argument the attribute value and should return the parsed value.
 *
 *   - n {string}: new name used for the attribute in the parsed object.
 *
 *   - def {*}: the default value used if the attribute is not found in the
 *     MPD.
 */
const attributes = {
  "ContentProtection": [
    { k: "schemeIdUri", fn: parseString },
    { k: "value", fn: parseString },
  ],

  "SegmentURL": [
    { k: "media",      fn: parseString },
    { k: "mediaRange", fn: parseByteRange },
    { k: "index",      fn: parseString },
    { k: "indexRange", fn: parseByteRange },
  ],

  "S": [
    { k: "t", fn: parseInt, n: "ts"},
    { k: "d", fn: parseInt },
    { k: "r", fn: parseInt },
  ],

  "SegmentTimeline": [],
  "SegmentBase": SegmentBaseType,
  "SegmentTemplate": MultipleSegmentBaseType.concat([
    { k: "initialization",     fn: parseInitializationAttribute },
    { k: "index",              fn: parseString },
    { k: "media",              fn: parseString },
    { k: "bitstreamSwitching", fn: parseString },
  ]),
  "SegmentList": MultipleSegmentBaseType,

  "ContentComponent": [
    { k: "id",          fn: parseString },
    { k: "lang",        fn: normalizeLang },
    { k: "contentType", fn: parseString },
    { k: "par",         fn: parseRatio },
  ],

  "Representation": RepresentationBaseType.concat([
    { k: "id",             fn: parseString },
    { k: "bandwidth",      fn: parseInt, n: "bitrate" },
    { k: "qualityRanking", fn: parseInt },
  ]),

  "AdaptationSet": RepresentationBaseType.concat([
    { k: "id",                  fn: parseString },
    { k: "group",               fn: parseInt },
    { k: "lang",                fn: normalizeLang },
    { k: "contentType",         fn: parseString },
    { k: "par",                 fn: parseRatio },
    { k: "minBandwidth",        fn: parseInt, n: "minBitrate" },
    { k: "maxBandwidth",        fn: parseInt, n: "maxBitrate" },
    { k: "minWidth",            fn: parseInt },
    { k: "maxWidth",            fn: parseInt },
    { k: "minHeight",           fn: parseInt },
    { k: "maxHeight",           fn: parseInt },
    { k: "minFrameRate",        fn: parseFrameRate },
    { k: "maxFrameRate",        fn: parseFrameRate },
    { k: "segmentAlignment",    fn: parseIntOrBoolean },
    { k: "subsegmentAlignment", fn: parseIntOrBoolean },
    { k: "bitstreamSwitching",  fn: parseBoolean },
  ]),

  "Period": [
    { k: "id",                 fn: parseString },
    { k: "start",              fn: parseDuration },
    { k: "duration",           fn: parseDuration },
    { k: "bitstreamSwitching", fn: parseBoolean },
  ],

  "MPD": [
    { k: "id",                         fn: parseString },
    { k: "profiles",                   fn: parseString },
    { k: "type",                       fn: parseString, def: "static" },
    { k: "availabilityStartTime",      fn: parseDateTime },
    { k: "availabilityEndTime",        fn: parseDateTime },
    { k: "publishTime",                fn: parseDateTime },
    { k: "mediaPresentationDuration",  fn: parseDuration, n: "duration" },
    { k: "minimumUpdatePeriod",        fn: parseDuration },
    { k: "minBufferTime",              fn: parseDuration },
    { k: "timeShiftBufferDepth",       fn: parseDuration },
    { k: "suggestedPresentationDelay", fn: parseDuration },
    { k: "maxSegmentDuration",         fn: parseDuration },
    { k: "maxSubsegmentDuration",      fn: parseDuration },
  ],

  "Role": [
    { k: "schemeIdUri", fn: parseString },
    { k: "value",       fn: parseString},
  ],

  "Accessibility": [
    { k: "schemeIdUri", fn: parseString },
    { k: "value",       fn: parseString},
  ],
};

/**
 * Reduce on each immediate children from the Document object given.
 * @param {Document} root
 * @param {Function} fn - Will be called on each children with the following
 * arguments:
 *   1. the reducer's accumulator
 *   2. the current node's name
 *   3. the current node Document Object
 * @param {*} init - the initial value for the accumulator
 * @returns {*} - the accumulator
 */
function reduceChildren(root, fn, init) {
  let node = root.firstElementChild, r = init;
  while (node) {
    r = fn(r, node.nodeName, node);
    node = node.nextElementSibling;
  }
  return r;
}

/**
 * Parse the contentProtection node of a MPD.
 * @param {Document} root
 * @param {Function} contentProtectionParser
 * @returns {Object}
 */
function parseContentProtection(root, contentProtectionParser) {
  return contentProtectionParser(feedAttributes(root), root);
}

function parseSegmentBase(root) {
  const index = reduceChildren(root, (res, name, node) => {
    if (name == "Initialization") {
      res.initialization = parseInitialization(node);
    }
    return res;
  }, feedAttributes(root));
  if (root.nodeName == "SegmentBase") {
    index.indexType = "base";
    index.timeline = [];
  }
  return index;
}

function parseMultipleSegmentBase(root) {
  return reduceChildren(root, (res, name, node) => {
    if (name == "SegmentTimeline") {
      res.indexType = "timeline";
      res.timeline = parseSegmentTimeline(node);
    }
    return res;
  }, parseSegmentBase(root));
}

function parseSegmentTimeline(root) {
  return reduceChildren(root, (arr, name, node) => {
    const len = arr.length;
    const seg = feedAttributes(node);
    if (seg.ts == null) {
      const prev = (len > 0) && arr[len - 1];
      seg.ts = prev
        ? prev.ts + prev.d * (prev.r + 1)
        : 0;
    }
    if (seg.r == null) {
      seg.r = 0;
    }
    arr.push(seg);
    return arr;
  }, []);
}

function parseInitializationAttribute(attrValue) {
  return { media: attrValue, range: undefined };
}

function parseInitialization(root) {
  let range, media;

  if (root.hasAttribute("range")) {
    range = parseByteRange(root.getAttribute("range"));
  }

  if (root.hasAttribute("sourceURL")) {
    media = root.getAttribute("sourceURL");
  }

  return { range, media };
}

function parseSegmentTemplate(root) {
  const base = parseMultipleSegmentBase(root);
  if (!base.indexType) {
    base.indexType = "template";
  }
  return base;
}

function parseSegmentList(root) {
  const base = parseMultipleSegmentBase(root);
  base.list = [];
  base.indexType = "list";
  return reduceChildren(root, (res, name, node) => {
    if (name == "SegmentURL") {
      res.list.push(feedAttributes(node));
    }
    return res;
  }, base);
}

function parseRepresentation(root) {
  const rep = reduceChildren(root, (res, name, node) => {
    switch(name) {
     // case "FramePacking": break;
     // case "AudioChannelConfiguration": break;
     // case "ContentProtection": res.contentProtection = parseContentProtection(node); break;
     // case "EssentialProperty": break;
     // case "SupplementalProperty": break;
     // case "InbandEventStream": break;
    case "BaseURL": res.baseURL = node.textContent; break;
    // case "SubRepresentation": break;
    case "SegmentBase": res.index = parseSegmentBase(node); break;
    case "SegmentList": res.index = parseSegmentList(node); break;
    case "SegmentTemplate": res.index = parseSegmentTemplate(node); break;
    }
    return res;
  }, {});

  return feedAttributes(root, rep);
}

function parseRole(root) {
  return feedAttributes(root);
}

function parseAccessibility(root) {
  return feedAttributes(root);
}

function parseContentComponent(root) {
  return feedAttributes(root);
}

function parseAdaptationSet(root, contentProtectionParser) {
  const res = reduceChildren(root, (res, name, node) => {
    switch(name) {
    case "Accessibility": res.accessibility = parseAccessibility(node); break;
    case "Role": res.role = parseRole(node); break;
    // case "Rating": break;
    // case "Viewpoint": break;
    case "ContentProtection": res.contentProtection = parseContentProtection(node, contentProtectionParser); break;
    case "ContentComponent": res.contentComponent = parseContentComponent(node); break;
    case "BaseURL": res.baseURL = node.textContent; break;
    case "SegmentBase": res.index = parseSegmentBase(node); break;
    case "SegmentList": res.index = parseSegmentList(node); break;
    case "SegmentTemplate": res.index = parseSegmentTemplate(node); break;
    case "Representation":
      const rep = parseRepresentation(node);
      if (rep.id == null) {
        rep.id = res.representations.length;
      }
      res.representations.push(rep); break;
    }
    return res;
  }, { representations: [] });

  return feedAttributes(root, res);
}

/**
 * Parse a single manifest period.
 * @param {Document} root
 * @param {Function} contentProtectionParser
 * @returns {Object}
 */
function parsePeriod(root, contentProtectionParser) {
  return feedAttributes(root, reduceChildren(root, (res, name, node) => {
    switch(name) {
    case "BaseURL": res.baseURL = node.textContent; break;
    case "AdaptationSet":
      const ada = parseAdaptationSet(node, contentProtectionParser);
      if (ada.id == null) {
        ada.id = res.adaptations.length;
      }
      res.adaptations.push(ada); break;
    }
    return res;
  }, { adaptations: [] }));
}

/**
 * @param {Document} manifest - Original manifest as returned by the server
 * @param {Function} [contentProtectionParser]
 * @returns {Object} - parsed manifest
 */
function parseFromDocument(document, contentProtectionParser) {
  const root = document.documentElement;
  assert.equal(root.nodeName, "MPD", "document root should be MPD");

  let manifest = reduceChildren(root, (res, name, node) => {
    switch(name) {
    case "BaseURL": res.baseURL = node.textContent; break;
    case "Location": res.locations.push(node.textContent); break;
    case "Period": res.periods.push(parsePeriod(node, contentProtectionParser)); break;
    }
    return res;
  }, {
    transportType: "dash",
    periods: [],
    locations: [],
  });

  manifest = feedAttributes(root, manifest);

  if (/dynamic/.test(manifest.type)) {
    const adaptations = manifest.periods[0].adaptations;

    // TODO video should not be limited to mp4
    const videoAdaptation = adaptations.filter((a) => a.mimeType == "video/mp4")[0];

    let lastRef = getLastLiveTimeReference(videoAdaptation);

    if (__DEV__) {
      assert(lastRef);
      assert(manifest.availabilityStartTime);
    }

    // if last time not found / something was invalid in the indexes, set a
    // default live time.
    if (!lastRef) {
      console.warn("Live edge not deduced from manifest, setting a default one");
      lastRef = Date.now() / 1000 - 60;
    }

    manifest.availabilityStartTime = manifest.availabilityStartTime.getTime() / 1000;
    manifest.presentationLiveGap = Date.now() / 1000 - (lastRef + manifest.availabilityStartTime);
  }

  return manifest;
}

/**
 * Returns "last time of reference" from the adaptation given, considering a
 * live content.
 * Undefined if a time could not be found.
 *
 * We consider the earliest last time from every representations in the given
 * adaptation.
 *
 * This is done to calculate a liveGap which is valid for the whole manifest,
 * even in weird ones.
 * @param {Object} adaptation
 * @returns {Number|undefined}
 */
const getLastLiveTimeReference = (adaptation) => {
  // Here's how we do, for each possibility:
  //  1. only the adaptation has an index (no representation has):
  //    - returns the index last time reference
  //
  //  2. every representations have an index:
  //    - returns minimum for every representations
  //
  //  3. not all representations have an index but the adaptation has
  //    - returns minimum between all representations and the adaptation
  //
  //  4. no index for 1+ representation(s) and no adaptation index:
  //    - returns undefined
  //
  //  5. Invalid index found somewhere:
  //    - returns undefined

  if (!adaptation) {
    return;
  }

  const representations = adaptation.representations || [];
  const representationsWithIndex = representations.filter(r => r && r.index);

  if (!representations.length) {
    return calculateIndexLastLiveTimeReference(adaptation.index);
  }

  const representationsMin = Math.min(
    ...representationsWithIndex
      .map(r => calculateIndexLastLiveTimeReference(r.index))
  );

  // should not happen, means invalid index data has been found
  if (isNaN(representationsMin)) {
    return;
  }

  if (representations.length === representationsWithIndex.length) {
    return representationsMin;
  }

  if (adaptation.index) {
    const adaptationRef = calculateIndexLastLiveTimeReference(adaptation.index);
    return Math.min(representationsMin, adaptationRef);
  }
};

/**
 * @param {string} manifest - manifest file in a string format
 * @param {Function} [contentProtectionParser]
 * @returns {Object} - parsed manifest
 */
function parseFromString(manifest, contentProtectionParser) {
  return parser
    .parseFromDocument(new DOMParser().parseFromString(manifest, "application/xml"), contentProtectionParser);
}

/**
 * @param {string|Document} manifest - Original manifest as returned by the
 * server. Either in string format, or in a Document Object format.
 * @param {Function} [contentProtectionParser]
 * @returns {Object} - parsed manifest
 */
function parser(manifest, contentProtectionParser) {
  if (typeof manifest == "string") {
    return parser.parseFromString(manifest, contentProtectionParser);
  } else {
    return parser.parseFromDocument(manifest, contentProtectionParser);
  }
}

parser.parseFromString   = parseFromString;
parser.parseFromDocument = parseFromDocument;

module.exports = parser;
