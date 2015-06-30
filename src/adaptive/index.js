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
var log = require("canal-js-utils/log");
var { Observable, BehaviorSubject, CompositeDisposable } = require("canal-js-utils/rx");
var { combineLatest } = Observable;
var { only } = require("canal-js-utils/rx-ext");

var AverageBitrate = require("./average-bitrate");

var DEFAULTS = {
  defLanguage: "fra",
  defSubtitle: "",
  // default buffer size in seconds
  defBufSize: 30,
  // buffer threshold ratio used as a lower bound
  // margin to find the suitable representation
  defBufThreshold: 0.3,
};

function def(x, val) {
  return typeof x == "number" && x > 0 ? x : val;
}

function getClosestBitrate(bitrates, btr, threshold=0) {
  return _.findLast(bitrates, b => (b / btr) <= (1 - threshold)) || bitrates[0];
}

function getClosestDisplayBitrate(reps, width) {
  var rep = _.find(reps, r => r.width >= width);
  if (rep)
    return rep.bitrate;
  else
    return Infinity;
}

function findByLang(adaptations, lang) {
  if (lang) {
    return _.find(adaptations, a => a.lang === lang);
  } else {
    return null;
  }
}

function filterByType(stream, selectedType) {
  return stream.filter(({ type }) => type === selectedType);
}

module.exports = function(metrics, timings, deviceEvents, options={}) {
  var {
    defLanguage,
    defSubtitle,
    defBufSize,
    defBufThreshold,
    initVideoBitrate,
    initAudioBitrate
  } = _.defaults(options, DEFAULTS);

  var { videoWidth, inBackground } = deviceEvents;

  var $languages = new BehaviorSubject(defLanguage);
  var $subtitles = new BehaviorSubject(defSubtitle);

  var $averageBitrates = {
    audio: AverageBitrate(filterByType(metrics, "audio"), timings, { alpha: 0.6 }).publishValue(initAudioBitrate || 0),
    video: AverageBitrate(filterByType(metrics, "video"), timings, { alpha: 0.6 }).publishValue(initVideoBitrate || 0),
  };

  var conns = new CompositeDisposable(_.map(_.values($averageBitrates), a => a.connect()));

  var $usrBitrates = {
    audio: new BehaviorSubject(Infinity),
    video: new BehaviorSubject(Infinity),
  };

  var $maxBitrates = {
    audio: new BehaviorSubject(Infinity),
    video: new BehaviorSubject(Infinity),
  };

  var $bufSizes = {
    audio: new BehaviorSubject(defBufSize),
    video: new BehaviorSubject(defBufSize),
    text:  new BehaviorSubject(defBufSize),
  };

  function audioAdaptationChoice(adaptations) {
    return $languages.changes()
      .map(lang => findByLang(adaptations, lang) || adaptations[0]);
  }

  function textAdaptationChoice(adaptations) {
     return $subtitles.changes()
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
            bufThreshold = defBufThreshold;

          return getClosestBitrate(bitrates, avrBitrate, bufThreshold);
        })
        .changes()
        .customDebounce(2000, { leading: true });

      if (type == "video") {
        // To compute the bitrate upper-bound for video
        // representations we need to combine multiple stream:
        //   - user-based maximum bitrate (subject)
        //   - maximum based on the video element width
        //   - maximum based on the application visibility (background tab)
        maxBitrates = combineLatest(
          maxBitrates,
          videoWidth.map(width => getClosestDisplayBitrate(representations, width)),
          inBackground.map(isHidden => isHidden ? bitrates[0] : Infinity),
          Math.min);
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
        .map(b => _.find(representations, rep => rep.bitrate === getClosestBitrate(bitrates, b)))
        .changes(r => r.id)
        .tap(r => log.info("bitrate", type, r.bitrate));
    }
    else {
      representationsObservable = only(firstRep);
    }

    return {
      representations: representationsObservable,
      bufferSizes: $bufSizes[type] || new BehaviorSubject(defBufSize),
    };
  }

  return {
    setLanguage(lng) { $languages.onNext(lng); },
    setSubtitle(sub) { $subtitles.onNext(sub); },
    getLanguage() { return $languages.value; },
    getSubtitle() { return $subtitles.value; },

    getAverageBitrates() { return $averageBitrates; },

    getAudioMaxBitrate() { return $maxBitrates.audio.value; },
    getVideoMaxBitrate() { return $maxBitrates.video.value; },
    getAudioBufferSize() { return $bufSizes.audio.value; },
    getVideoBufferSize() { return $bufSizes.video.value; },

    setAudioBitrate(x)    { $usrBitrates.audio.onNext(def(x, Infinity)); },
    setVideoBitrate(x)    { $usrBitrates.video.onNext(def(x, Infinity)); },
    setAudioMaxBitrate(x) { $maxBitrates.audio.onNext(def(x, Infinity)); },
    setVideoMaxBitrate(x) { $maxBitrates.video.onNext(def(x, Infinity)); },
    setAudioBufferSize(x) { $bufSizes.audio.onNext(def(x, defBufSize)); },
    setVideoBufferSize(x) { $bufSizes.video.onNext(def(x, defBufSize)); },

    getBufferAdapters,
    getAdaptationsChoice,

    dispose() {
      if (conns) {
        conns.dispose();
        conns = null;
      }
    }
  };
};
