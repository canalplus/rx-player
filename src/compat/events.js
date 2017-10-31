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
 * This file provides browser-agnostic event listeners under the form of
 * RxJS Observables
 */

import { Observable } from "rxjs/Observable";

import config from "../config.js";

import log from "../utils/log";
import onEvent from "../utils/rx-onEvent.js";

import {
  HTMLElement_,
  BROWSER_PREFIXES,
} from "./constants.js";

const INACTIVITY_DELAY = config.INACTIVITY_DELAY;
const pixelRatio = window.devicePixelRatio || 1;

function isEventSupported(element, eventNameSuffix) {
  const clone = document.createElement(element.tagName);
  const eventName = "on" + eventNameSuffix;
  if (eventName in clone) {
    return true;
  } else {
    clone.setAttribute(eventName, "return;");
    return typeof clone[eventName] == "function";
  }
}

function findSupportedEvent(element, eventNames) {
  return eventNames
    .filter((name) => isEventSupported(element, name))[0];
}

function eventPrefixed(eventNames, prefixes) {
  return eventNames.reduce((parent, name) =>
    parent
      .concat((prefixes || BROWSER_PREFIXES)
      .map((p) => p + name)), []);
}

function compatibleListener(eventNames, prefixes) {
  let mem;
  eventNames = eventPrefixed(eventNames, prefixes);
  return (element) => {
    // if the element is a HTMLElement we can detect
    // the supported event, and memoize it in `mem`
    if (element instanceof HTMLElement_) {
      if (typeof mem == "undefined") {
        mem = findSupportedEvent(element, eventNames) || null;
      }

      if (mem) {
        return Observable.fromEvent(element, mem);
      } else {
        if (__DEV__) {
          log.warn(
            `compat: element <${element.tagName}> does not support any of these events: ${eventNames.join(", ")}`
          );
        }
        return Observable.never();
      }
    }

    // otherwise, we need to listen to all the events
    // and merge them into one observable sequence
    return onEvent(element, eventNames);
  };
}

/**
 * Returns an observable:
 *   - emitting true when the visibility of document changes to hidden
 *   - emitting false when the visibility of document changes to visible
 * @returns {Observable}
 */
const visibilityChange = () => {
  let prefix;
  if (document.hidden != null) {
    prefix = "";
  } else if (document.mozHidden != null) {
    prefix = "moz";
  } else if (document.msHidden != null) {
    prefix = "ms";
  } else if (document.webkitHidden != null) {
    prefix = "webkit";
  }

  const hidden = prefix ? prefix + "Hidden" : "hidden";
  const visibilityChangeEvent = prefix + "visibilitychange";

  return onEvent(document, visibilityChangeEvent)
    .map(() => document[hidden]);
};

const videoSizeChange = () => onEvent(window, "resize");

const isVisible = visibilityChange() // emit false when visible
  .filter((x) => x === false);

// Emit true if the visibility changed to hidden since 60s
const isHidden = visibilityChange()
  .debounceTime(INACTIVITY_DELAY)
  .filter((x) => x === true);

const isInBackground$ = () => Observable.merge(isVisible, isHidden)
  .startWith(false);

const videoWidth$ = videoElement => {
  return Observable.merge(
    Observable.interval(20000),
    videoSizeChange().debounceTime(500)
  )
    .startWith("init") // emit on subscription
    .map(() => videoElement.clientWidth * pixelRatio)
    .distinctUntilChanged();

};

const onLoadedMetadata$ = compatibleListener(["loadedmetadata"]);
const onSeeking$ = compatibleListener(["seeking"]);
const onSeeked$ = compatibleListener(["seeked"]);
const onEnded$ = compatibleListener(["ended"]);
const onTimeUpdate$ = compatibleListener(["timeupdate"]);
const onFullscreenChange$ = compatibleListener(
  ["fullscreenchange", "FullscreenChange"],

  // On IE11, fullscreen change events is called MSFullscreenChange
  BROWSER_PREFIXES.concat("MS")
);

const onPlayPause$ = videoElement =>
  Observable.merge(
    compatibleListener(["play"])(videoElement),
    compatibleListener(["pause"])(videoElement)
  );

const onTextTrackChanges$ = videoElement =>
  Observable.merge(
    compatibleListener(["addtrack"])(videoElement),
    compatibleListener(["removetrack"])(videoElement)
  );

const onSourceOpen$ = compatibleListener(["sourceopen", "webkitsourceopen"]);
const onEncrypted$ = compatibleListener(["encrypted", "needkey"]);
const onKeyMessage$ = compatibleListener(["keymessage", "message"]);
const onKeyAdded$ = compatibleListener(["keyadded", "ready"]);
const onKeyError$ = compatibleListener(["keyerror", "error"]);
const onKeyStatusesChange$ = compatibleListener(["keystatuseschange"]);

export {
  isInBackground$,
  videoWidth$,
  onPlayPause$,
  onTextTrackChanges$,
  onLoadedMetadata$,
  onSeeking$,
  onSeeked$,
  onEnded$,
  onTimeUpdate$,
  onFullscreenChange$,
  onSourceOpen$,
  onEncrypted$,
  onKeyMessage$,
  onKeyAdded$,
  onKeyError$,
  onKeyStatusesChange$,
};
