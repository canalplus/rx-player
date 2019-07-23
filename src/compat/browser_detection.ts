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

// true on IE11
// false on Edge and other IEs/browsers.
const isIE11 : boolean = !!(window as any).MSInputMethodContext &&
                         !!(document as any).documentMode;

// true for IE / Edge
const isIEOrEdge : boolean = navigator.appName === "Microsoft Internet Explorer" ||
                             navigator.appName === "Netscape" &&
                             /(Trident|Edge)\//.test(navigator.userAgent);

const isFirefox : boolean = navigator.userAgent.toLowerCase()
                                               .indexOf("firefox") !== -1;

const isSamsungBrowser : boolean = /SamsungBrowser/.test(navigator.userAgent);

const isSafari : boolean = /Safari/i.test(navigator.userAgent);

export {
  isIE11,
  isIEOrEdge,
  isFirefox,
  isSafari,
  isSamsungBrowser,
};
