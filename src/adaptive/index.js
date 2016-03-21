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

const log = require("canal-js-utils/log");
const { Subscription } = require("rxjs/Subscription");
const { BehaviorSubject } = require("rxjs/subject/BehaviorSubject");
const { combineLatestStatic } = require("rxjs/operator/combineLatest");
const { only } = require("../utils/rx-utils");
const find = require("lodash/collection/find");
const findLast = require("lodash/collection/findLast");
const defaults = require("lodash/object/defaults");

const AverageBitrate = require("./average-bitrate");

const DEFAULTS = {
  defaultLanguage: "fra",
  defaultSubtitle: "",
  // default buffer size in seconds
  defaultBufferSize: 30,
  // buffer threshold ratio used as a lower bound
  // margin to find the suitable representation
  defaultBufferThreshold: 0.3,
};

function def(x, val) {
  return typeof x == "number" && x > 0 ? x : val;
}

function getClosestBitrate(bitrates, btr, threshold=0) {
  return findLast(bitrates, (b) => (b / btr) <= (1 - threshold)) || bitrates[0];
}

function getClosestDisplayBitrate(reps, width) {
  const rep = find(reps, (r) => r.width >= width);
  if (rep) {
    return rep.bitrate;
  } else {
    return Infinity;
  }
}

function findByLang(adaptations, lang) {
  if (lang) {
    return find(adaptations, (a) => a.lang === lang);
  } else {
    return null;
  }
}

function filterByType(stream, selectedType) {
  return stream.filter(({ type }) => type === selectedType);
}

module.exports = function(metrics, timings, deviceEvents, options={}) {
  const {
    defaultLanguage,
    defaultSubtitle,
    defaultBufferSize,
    defaultBufferThreshold,
    initVideoBitrate,
    initAudioBitrate,
  } = defaults(options, DEFAULTS);

  const { videoWidth, inBackground } = deviceEvents;

  const $languages = new BehaviorSubject(defaultLanguage);
  const $subtitles = new BehaviorSubject(defaultSubtitle);

  const $averageBitrates = {
    audio: new BehaviorSubject(initAudioBitrate || 0),
    video: new BehaviorSubject(initVideoBitrate || 0),
  };

  const averageBitratesConns = [
    AverageBitrate(filterByType(metrics, "audio"), { alpha: 0.6 }).multicast($averageBitrates.audio),
    AverageBitrate(filterByType(metrics, "video"), { alpha: 0.6 }).multicast($averageBitrates.video),
  ];

  let conns = new Subscription();
  averageBitratesConns.forEach((a) => conns.add(a.connect()));

  const $usrBitrates = {
    audio: new BehaviorSubject(Infinity),
    video: new BehaviorSubject(Infinity),
  };

  const $maxBitrates = {
    audio: new BehaviorSubject(Infinity),
    video: new BehaviorSubject(Infinity),
  };

  const $bufSizes = {
    audio: new BehaviorSubject(defaultBufferSize),
    video: new BehaviorSubject(defaultBufferSize),
    text:  new BehaviorSubject(defaultBufferSize),
  };

  function audioAdaptationChoice(adaptations) {
    return $languages.distinctUntilChanged()
      .map((lang) => findByLang(adaptations, lang) || adaptations[0]);
  }

  function textAdaptationChoice(adaptations) {
    return $subtitles.distinctUntilChanged()
      .map((lang) => findByLang(adaptations, lang));
  }

  function getAdaptationsChoice(type, adaptations) {
    if (type == "audio") {
      return audioAdaptationChoice(adaptations);
    }

    if (type == "text") {
      return textAdaptationChoice(adaptations);
    }

    if (adaptations.length == 1) {
      return only(adaptations[0]);
    }

    throw new Error(`adaptive: unknown type ${type} for adaptation chooser`);
  }

  function getBufferAdapters(adaptation) {
    const { type, bitrates, representations } = adaptation;

    const firstRep = representations[0];

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
        // To compute the bitrate upper-bound for video
        // representations we need to combine multiple stream:
        //   - user-based maximum bitrate (subject)
        //   - maximum based on the video element width
        //   - maximum based on the application visibility (background tab)
        maxBitrates = combineLatestStatic(maxBitrates, videoWidth, inBackground,
          (bitrate, width, isHidden) => {
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

      representationsObservable = combineLatestStatic(
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
        .distinctUntilChanged((a, b) => a.id === b.id)
        .do((r) => log.info("bitrate", type, r.bitrate));
    }
    else {
      representationsObservable = only(firstRep);
    }

    return {
      representations: representationsObservable,
      bufferSizes: $bufSizes[type] || new BehaviorSubject(defaultBufferSize),
    };
  }

  return {
    setLanguage(lng) { $languages.next(lng); },
    setSubtitle(sub) { $subtitles.next(sub); },
    getLanguage() { return $languages.value; },
    getSubtitle() { return $subtitles.value; },

    getAverageBitrates() { return $averageBitrates; },

    getAudioMaxBitrate() { return $maxBitrates.audio.value; },
    getVideoMaxBitrate() { return $maxBitrates.video.value; },
    getAudioBufferSize() { return $bufSizes.audio.value; },
    getVideoBufferSize() { return $bufSizes.video.value; },

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
