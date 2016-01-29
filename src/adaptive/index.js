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

var log = require("canal-js-utils/log");
var { Observable, BehaviorSubject, Subscription } = require("rxjs");
var { combineLatest } = Observable;
var { only } = require("canal-js-utils/rx-ext");
var find = require("lodash/collection/find");
var findLast = require("lodash/collection/findLast");
var defaults = require("lodash/object/defaults");

var AverageBitrate = require("./average-bitrate");

var DEFAULTS = {
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
  return findLast(bitrates, b => (b / btr) <= (1 - threshold)) || bitrates[0];
}

function getClosestDisplayBitrate(reps, width) {
  var rep = find(reps, r => r.width >= width);
  if (rep)
    return rep.bitrate;
  else
    return Infinity;
}

function findByLang(adaptations, lang) {
  if (lang) {
    return find(adaptations, a => a.lang === lang);
  } else {
    return null;
  }
}

function filterByType(stream, selectedType) {
  return stream.filter(({ type }) => type === selectedType);
}

module.exports = function(metrics, timings, deviceEvents, options={}) {
  var {
    defaultLanguage,
    defaultSubtitle,
    defaultBufferSize,
    defaultBufferThreshold,
    initVideoBitrate,
    initAudioBitrate,
  } = defaults(options, DEFAULTS);

  var { videoWidth, inBackground } = deviceEvents;

  var $languages = new BehaviorSubject(defaultLanguage);
  var $subtitles = new BehaviorSubject(defaultSubtitle);

  var $averageBitrates = {
    audio: new BehaviorSubject(initAudioBitrate || 0),
    video: new BehaviorSubject(initVideoBitrate || 0),
  };

  var averageBitratesConns = [
    AverageBitrate(filterByType(metrics, "audio"), { alpha: 0.6 }).multicast($averageBitrates.audio),
    AverageBitrate(filterByType(metrics, "video"), { alpha: 0.6 }).multicast($averageBitrates.video),
  ];

  var conns = new Subscription();
  averageBitratesConns.forEach((a) => conns.add(a.connect()));

  var $usrBitrates = {
    audio: new BehaviorSubject(Infinity),
    video: new BehaviorSubject(Infinity),
  };

  var $maxBitrates = {
    audio: new BehaviorSubject(Infinity),
    video: new BehaviorSubject(Infinity),
  };

  var $bufSizes = {
    audio: new BehaviorSubject(defaultBufferSize),
    video: new BehaviorSubject(defaultBufferSize),
    text:  new BehaviorSubject(defaultBufferSize),
  };

  function audioAdaptationChoice(adaptations) {
    return $languages.distinctUntilChanged()
      .map(lang => findByLang(adaptations, lang) || adaptations[0]);
  }

  function textAdaptationChoice(adaptations) {
    return $subtitles.distinctUntilChanged()
      .map(lang => findByLang(adaptations, lang));
  }

  function getAdaptationsChoice(type, adaptations) {
    if (type == "audio")
      return audioAdaptationChoice(adaptations);

    if (type == "text")
      return textAdaptationChoice(adaptations);

    if (adaptations.length == 1)
      return only(adaptations[0]);

    throw new Error(`adaptive: unknown type ${type} for adaptation chooser`);
  }

  function getBufferAdapters(adaptation) {
    var { type, bitrates, representations } = adaptation;

    var firstRep = representations[0];

    var representationsObservable;
    if (representations.length > 1) {
      var usrBitrates = $usrBitrates[type];
      var maxBitrates = $maxBitrates[type];

      var avrBitrates = $averageBitrates[type]
        .map((avrBitrate, count) => {
          // no threshold for the first value of the average bitrate
          // stream corresponding to the selected initial video bitrate
          var bufThreshold;
          if (count === 0)
            bufThreshold = 0;
          else
            bufThreshold = defaultBufferThreshold;

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
        maxBitrates = combineLatest(maxBitrates, videoWidth, inBackground,
          (bitrate, width, isHidden) => {
            if (isHidden)
              return bitrates[0];

            var closestDisplayBitrate = getClosestDisplayBitrate(representations, width);
            if (closestDisplayBitrate < bitrate)
              return closestDisplayBitrate;

            return bitrate;
          });
      }

      representationsObservable = combineLatest(
        usrBitrates,
        maxBitrates,
        avrBitrates,
        (usr, max, avr) => {
          if (usr < Infinity)
            return usr;

          if (max < Infinity)
            return Math.min(max, avr);

          return avr;
        })
        .map(b => find(representations, rep => rep.bitrate === getClosestBitrate(bitrates, b)))
        .distinctUntilChanged((a, b) => a.id === b.id)
        .do(r => log.info("bitrate", type, r.bitrate));
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

    dispose() {
      if (conns) {
        conns.unsubscribe();
        conns = null;
      }
    },
  };
};
