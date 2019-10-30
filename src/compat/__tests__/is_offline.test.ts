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

// FIXME We cannot mock navigator.onLine easily, sadly
/* tslint:disable no-unsafe-any */
xdescribe("Compat - isOffline", () => {
  it("should return true if navigator.onLine is `false`", () => {
    const oldNavigator = window.navigator;
    (window as any).navigator = { onLine: false };
    const isOffline = require("../is_offline").default;
    expect(isOffline()).toEqual(true);
    (window as any).navigator = oldNavigator;
  });

  it("should return false if navigator.onLine is `true`", () => {
    const oldNavigator = window.navigator;
    (window as any).navigator = { onLine: true };
    const isOffline = require("../is_offline").default;
    expect(isOffline()).toEqual(false);
    (window as any).navigator = oldNavigator;
  });

  it("should return false if navigator.onLine is `undefined`", () => {
    const oldNavigator = window.navigator;
    (window as any).navigator = {};
    const isOffline = require("../is_offline").default;
    expect(isOffline()).toEqual(false);
    (window as any).navigator = oldNavigator;
  });

  it("should return false if navigator.onLine is `null`", () => {
    const oldNavigator = window.navigator;
    (window as any).navigator = { onLine: null };
    const isOffline = require("../is_offline").default;
    expect(isOffline()).toEqual(false);
    (window as any).navigator = oldNavigator;
  });
});
/* tslint:enable no-unsafe-any */
