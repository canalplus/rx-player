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
var Promise_ = require("canal-js-utils/promise");
var Observable = require("canal-js-utils/rx").Observable;
var XMLHttpRequest = require("xhr2");
var DOMParser = require("xmldom").DOMParser;

function createCompatModule({ HTMLVideoElement, MediaSource, URL, EME }) {

  global.XMLHttpRequest = XMLHttpRequest;
  global.DOMParser = DOMParser;
  global.atob = function(b64string) {
    return new Buffer(b64string, "base64").toString();
  };


  var sourceOpen = (el) => Observable.fromEvent(el, "sourceopen");
  var loadedMetadataEvent = (el) => Observable.fromEvent(el, "loadedmetadata");
  var isCodecSupported = () => true;


  var setMediaKeys, requestMediaKeySystemAccess, emeEvents;
  if (EME) {
    requestMediaKeySystemAccess = EME.requestMediaKeySystemAccess;
    setMediaKeys = EME.setMediaKeys;
    emeEvents = EME.emeEvent;
  }
  else {
    requestMediaKeySystemAccess = () => Promise_.reject("not implemented");
    setMediaKeys = () => Promise_.reject("not implemented");
    emeEvents = {
      onEncrypted: Observable.never,
      onKeyMessage: () => Observable.throw("not implemented"),
      onKeyStatusesChange: () => Observable.throw("not implemented"),
      onKeyError: () => Observable.throw("not implemented"),
    };
  }


  var isFullscreen = () => false;
  var requestFullscreen = _.noop;
  var exitFullscreen = _.noop;
  var onFullscreenChange = Observable.never;


  var videoSizeChange = Observable.never;
  var visibilityChange = Observable.never;


  return {
    URL,

    HTMLVideoElement,
    MediaSource,
    isCodecSupported,
    sourceOpen,
    loadedMetadataEvent,

    requestMediaKeySystemAccess,
    setMediaKeys,
    emeEvents,

    isFullscreen,
    onFullscreenChange,
    requestFullscreen,
    exitFullscreen,

    videoSizeChange,
    visibilityChange,
  };
}

module.exports = createCompatModule;
