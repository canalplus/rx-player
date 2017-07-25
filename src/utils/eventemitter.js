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

import assert from "./assert";

function EventEmitter() {
  this.__listeners = {};
}

EventEmitter.prototype.addEventListener = function(evt, fn) {
  assert(typeof fn == "function", "eventemitter: second argument should be a function");
  if (!this.__listeners[evt]) {
    this.__listeners[evt] = [];
  }
  this.__listeners[evt].push(fn);
};

EventEmitter.prototype.removeEventListener = function(evt, fn) {
  if (arguments.length === 0) {
    this.__listeners = {};
    return;
  }
  if (!this.__listeners.hasOwnProperty(evt)) {
    return;
  }
  if (arguments.length === 1) {
    delete this.__listeners[evt];
    return;
  }
  const listeners = this.__listeners[evt];
  const index = listeners.indexOf(fn);
  if (~index) {
    listeners.splice(index, 1);
  }
  if (!listeners.length) {
    delete this.__listeners[evt];
  }
};

EventEmitter.prototype.trigger = function(evt, arg) {
  if (!this.__listeners.hasOwnProperty(evt)) {
    return;
  }
  const listeners = this.__listeners[evt].slice();
  listeners.forEach((listener) => {
    try {
      listener(arg);
    } catch(e) {
      console.error(e, e.stack);
    }
  });
};

// aliases
EventEmitter.prototype.on = EventEmitter.prototype.addEventListener;
EventEmitter.prototype.off = EventEmitter.prototype.removeEventListener;

export default EventEmitter;
