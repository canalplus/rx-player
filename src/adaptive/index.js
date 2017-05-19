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

const { Subscription } = require("rxjs/Subscription");
const { BehaviorSubject } = require("rxjs/BehaviorSubject");
const { combineLatest } = require("rxjs/observable/combineLatest");
const { only } = require("../utils/rx-utils");
const { findBetterMatchIndex } = require("../utils/languages");

const AverageBitrate = require("./average-bitrate");

const DEFAULTS = {
  defaultLanguage: {
    language: "fra",
    audioDescription: false,
  },
  defaultSubtitle: null,
  // default buffer size in seconds
  defaultBufferSize: 30,
  // buffer threshold ratio used as a lower bound
  // margin to find the suitable representation
  defaultBufferThreshold: 0.3,
  initVideoBitrate: 0,
  initAudioBitrate: 0,
  maxVideoBitrate: Infinity,
  maxAudioBitrate: Infinity,
};

/**
 * Simple find function implementation.
 * @param {Array} array
 * @param {Function} predicate - The predicate. Will take as arguments:
 *   1. the current array element
 *   2. the array index
 *   3. the entire array
 * @returns {*} - null if not found
 */
function find(array, predicate) {
  for (let i = 0; i < array.length; i++) {
    if (predicate(array[i], i, array) === true) {
      return array[i];
    }
  }
  return null;
}

/**
 * Returns val if x is either not a Number type or inferior or equal to 0.
 * @param {Number} [x]
 * @param {*} val
 * @returns {*}
 */
function def(x, val) {
  return typeof x == "number" && x > 0 ? x : val;
}

/**
 * Get closest bitrate lower or equal to the bitrate wanted when the threshold
 * is equal to 0. You can add a security margin by setting the threshold between
 * 0 and 1.
 * @param {Array.<Number>} bitrates - all available bitrates.
 * @param {Number} btr - a chosen bitrate
 * @param {Number} [treshold=0]
 * @returns {Number}
 */
function getClosestBitrate(bitrates, btr, threshold=0) {
  for (let i = bitrates.length - 1; i >= 0; i--) {
    if ((bitrates[i] / btr) <= (1 - threshold)) {
      return bitrates[i];
    }
  }
  return bitrates[0];
}

/**
 * Get the bitrate from the first representation which has a width >= to the
 * width wanted.
 * Returns Infinity if not found.
 * @param {Array.<Object>} reps - The representations array
 * @param {Number} width
 * @returns {Number}
 */
function getClosestDisplayBitrate(reps, width) {
  const rep = find(reps, (r) => r.width >= width);
  if (rep) {
    return rep.bitrate;
  } else {
    return Infinity;
  }
}

/**
 * Find first adaptation with the corresponding language.
 * @param {Array.<Object>} adaptations
 * @param {string} lang
 * @returns {Object|null}
 */
function findAdaptationByLang(adaptations, lang) {
  const langs = adaptations.map(a => a.lang);

  const index = findBetterMatchIndex(langs, lang);
  if (index >= 0) {
    return adaptations[index];
  }
  return null;
}

/**
 * @param {Array.<Object>} adaptations
 * @param {string} lang
 * @param {Boolean} [audioDescription=false]
 * @returns {Object|null}
 */
function findAudioAdaptation(adaptations, lang, audioDescription = false) {
  const filteredAdaptations = adaptations.filter(adaptation =>
    adaptation.audioDescription == audioDescription
  );
  return findAdaptationByLang(filteredAdaptations, lang);
}

/**
 * @param {Array.<Object>} adaptations
 * @param {string} lang
 * @param {Boolean} [closedCaption=false]
 * @returns {Object|null}
 */
function findTextAdaptation(adaptations, lang, closedCaption = false) {
  const filteredAdaptations = adaptations.filter(adaptation =>
    adaptation.closedCaption == closedCaption
  );
  return findAdaptationByLang(filteredAdaptations, lang);
}

/**
 * Filter the given observable/array to only keep the item with the selected
 * type.
 * @param {Observable|Array.<Object>} stream
 * @param {string} selectedType
 * @returns {Observable|Array.<Object>}
 */
function filterByType(stream, selectedType) {
  return stream.filter(({ type }) => type === selectedType);
}

module.exports = function(metrics, deviceEvents, options={}) {
  Object.keys(options).forEach(key =>
    options[key] === undefined && delete options[key]
  );

  const {
    defaultLanguage,
    defaultSubtitle,
    defaultBufferSize,
    defaultBufferThreshold,
    initVideoBitrate,
    initAudioBitrate,
    maxVideoBitrate,
    maxAudioBitrate,
    limitVideoWidth,
    throttleWhenHidden,
  } = Object.assign({}, DEFAULTS, options);

  const { videoWidth, inBackground } = deviceEvents;

  const $languages = new BehaviorSubject(defaultLanguage);
  const $subtitles = new BehaviorSubject(defaultSubtitle);

  const $averageBitrates = {
    audio: new BehaviorSubject(initAudioBitrate),
    video: new BehaviorSubject(initVideoBitrate),
  };

  const averageBitratesConns = [
    AverageBitrate(filterByType(metrics, "audio"), { alpha: 0.6 })
      .multicast($averageBitrates.audio),
    AverageBitrate(filterByType(metrics, "video"), { alpha: 0.6 })
      .multicast($averageBitrates.video),
  ];

  let conns = new Subscription();
  averageBitratesConns.forEach((a) => conns.add(a.connect()));

  const $usrBitrates = {
    audio: new BehaviorSubject(Infinity),
    video: new BehaviorSubject(Infinity),
  };

  const $maxBitrates = {
    audio: new BehaviorSubject(maxAudioBitrate),
    video: new BehaviorSubject(maxVideoBitrate),
  };

  const $bufSizes = {
    audio: new BehaviorSubject(defaultBufferSize),
    video: new BehaviorSubject(defaultBufferSize),
    text:  new BehaviorSubject(defaultBufferSize),
  };

  /**
   * Returns an Observable emitting:
   *   - first, the current audio adaption
   *   - the new one each time it changes
   * @param {Array.<Object>} adaptations - The available audio adaptations
   * objects.
   * @returns {Observable}
   */
  function audioAdaptationChoice(adaptations) {
    return $languages.distinctUntilChanged()
      .map(({ language, audioDescription }) =>
        findAudioAdaptation(
          adaptations,
          language,
          audioDescription
        ) || adaptations[0]
      );
  }

  /**
   * Returns an Observable emitting:
   *   - first, the current text adaption
   *   - the new one each time it changes
   * @param {Array.<Object>} adaptations - The available text adaptations
   * objects.
   * @returns {Observable}
   */
  function textAdaptationChoice(adaptations) {
    return $subtitles.distinctUntilChanged()
      .map(arg =>
        arg ?  findTextAdaptation(
          adaptations,
          arg.language,
          arg.closedCaption
        ) : null
      );
  }

  /**
   * Get the current and new adaptations each time it changes for all
   * types.
   * Mostly useful for audio languages and text subtitles to know which one
   * to choose first and when it changes.
   * @param {string} type - The adaptation type
   * @param {Array.<Object>} adaptations
   * @returns {Observable}
   */
  function getAdaptationsChoice(type, adaptations) {
    if (type == "audio") {
      return audioAdaptationChoice(adaptations);
    }

    if (type == "text") {
      return textAdaptationChoice(adaptations);
    }

    return only(adaptations[0]);
  }

  /**
   * Returns an object containing two observables:
   *   - representations: the chosen best representation for the adaptation
   *     (correlated from the user, max and average bitrates)
   *   - bufferSizes: the bufferSize chosen
   * @param {Object} adaptation
   * @returns {Object}
   */
  function getBufferAdapters(adaptation) {
    const { type, bitrates, representations } = adaptation;

    let representationsObservable;
    if (representations.length > 1) {
      const usrBitrates = $usrBitrates[type];
      let maxBitrates = $maxBitrates[type];

      const avrBitrates = $averageBitrates[type]
        .map((avrBitrate, count) => {
          // no threshold for the first value of the average bitrate
          // stream corresponding to the selected initial video bitrate
          let bufThreshold;
          if (count === 0) {
            bufThreshold = 0;
          } else {
            bufThreshold = defaultBufferThreshold;
          }

          return getClosestBitrate(bitrates, avrBitrate, bufThreshold);
        })
        .distinctUntilChanged()
        .debounceTime(2000)
        .startWith(getClosestBitrate(bitrates, $averageBitrates[type].getValue(), 0));

      if (type == "video") {
        const maxBitrateUpdatesObs = [maxBitrates];

        if (limitVideoWidth) {
          maxBitrateUpdatesObs.push(videoWidth);
        }

        if (throttleWhenHidden) {
          maxBitrateUpdatesObs.push(inBackground);
        }

        // To compute the bitrate upper-bound for video
        // representations we need to combine multiple stream:
        //   - user-based maximum bitrate (subject)
        //   - maximum based on the video element width
        //   - maximum based on the application visibility (background tab)
        maxBitrates = combineLatest(...maxBitrateUpdatesObs)
          .map((bitrate, width, isHidden) => {
            if (isHidden) {
              return bitrates[0];
            }

            const closestDisplayBitrate = getClosestDisplayBitrate(representations, width);
            if (closestDisplayBitrate < bitrate) {
              return closestDisplayBitrate;
            }

            return bitrate;
          });
      }

      representationsObservable = combineLatest(
        usrBitrates,
        maxBitrates,
        avrBitrates,
        (usr, max, avr) => {
          let btr;
          if (usr < Infinity) {
            btr = usr;
          } else if (max < Infinity) {
            btr = Math.min(max, avr);
          } else {
            btr = avr;
          }
          return find(representations, (rep) => rep.bitrate === getClosestBitrate(bitrates, btr));
        })
        .distinctUntilChanged((a, b) => a.id === b.id);
    }
    else { // representations.length <= 1
      representationsObservable = only(representations[0]);
    }

    return {
      representations: representationsObservable,
      bufferSizes: $bufSizes[type] || new BehaviorSubject(defaultBufferSize),
    };
  }

  return {
    setLanguage(lng) { $languages.next(lng); },
    setSubtitle(sub) { $subtitles.next(sub); },
    getLanguage() { return $languages.getValue(); },
    getSubtitle() { return $subtitles.getValue(); },

    getAverageBitrates() { return $averageBitrates; },

    getAudioMaxBitrate() { return $maxBitrates.audio.getValue(); },
    getVideoMaxBitrate() { return $maxBitrates.video.getValue(); },
    getAudioBufferSize() { return $bufSizes.audio.getValue(); },
    getVideoBufferSize() { return $bufSizes.video.getValue(); },

    setAudioBitrate(x)    { $usrBitrates.audio.next(def(x, Infinity)); },
    setVideoBitrate(x)    { $usrBitrates.video.next(def(x, Infinity)); },
    setAudioMaxBitrate(x) { $maxBitrates.audio.next(def(x, Infinity)); },
    setVideoMaxBitrate(x) { $maxBitrates.video.next(def(x, Infinity)); },
    setAudioBufferSize(x) { $bufSizes.audio.next(def(x, defaultBufferSize)); },
    setVideoBufferSize(x) { $bufSizes.video.next(def(x, defaultBufferSize)); },

    getBufferAdapters,
    getAdaptationsChoice,

    unsubscribe() {
      if (conns) {
        conns.unsubscribe();
        conns = null;
      }
    },
  };
};
