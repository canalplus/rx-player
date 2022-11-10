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

import isNode from "./is_node";

interface IIE11WindowObject extends Window {
  MSInputMethodContext? : unknown;
}

interface IIE11Document extends Document {
  documentMode? : unknown;
}

// true on IE11
// false on Edge and other IEs/browsers.
const isIE11 : boolean =
  !isNode &&
  typeof (window as IIE11WindowObject).MSInputMethodContext !== "undefined" &&
  typeof (document as IIE11Document).documentMode !== "undefined";

// true for IE / Edge
const isIEOrEdge : boolean = isNode ?
  false :
  navigator.appName === "Microsoft Internet Explorer" ||
  navigator.appName === "Netscape" &&
  /(Trident|Edge)\//.test(navigator.userAgent);

const isEdgeChromium: boolean = !isNode &&
                                navigator.userAgent.toLowerCase().indexOf("edg/") !== -1;

const isFirefox : boolean = !isNode &&
                            navigator.userAgent.toLowerCase().indexOf("firefox") !== -1;

const isSamsungBrowser : boolean = !isNode &&
                                   /SamsungBrowser/.test(navigator.userAgent);

const isTizen : boolean = !isNode &&
                          /Tizen/.test(navigator.userAgent);

const isWebOs : boolean = !isNode &&
                          navigator.userAgent.indexOf("Web0S") >= 0;

// Inspired form: http://webostv.developer.lge.com/discover/specifications/web-engine/
// Note: even that page doesn't correspond to what we've actually seen in the
// wild
const isWebOs2021 : boolean = isWebOs &&
                              (
                                /(W|w)eb(O|0)S.TV-2021/.test(navigator.userAgent) ||
                                /(C|c)hr(o|0)me\/79/.test(navigator.userAgent)
                              );
const isWebOs2022 : boolean = isWebOs &&
                              (
                                /(W|w)eb(O|0)S.TV-2022/.test(navigator.userAgent) ||
                                /(C|c)hr(o|0)me\/87/.test(navigator.userAgent)
                              );

interface ISafariWindowObject extends Window {
  safari? : { pushNotification? : { toString() : string } };
}

/** `true` on Safari on a PC platform (i.e. not iPhone / iPad etc.) */
const isSafariDesktop : boolean =
  !isNode && (
    Object.prototype.toString.call(window.HTMLElement).indexOf("Constructor") >= 0 ||
    (window as ISafariWindowObject).safari?.pushNotification?.toString() ===
      "[object SafariRemoteNotification]"
  );

/** `true` on Safari on an iPhone, iPad & iPod platform */
const isSafariMobile : boolean = !isNode &&
                                 typeof navigator.platform === "string" &&
                                 /iPad|iPhone|iPod/.test(navigator.platform);

export {
  isEdgeChromium,
  isIE11,
  isIEOrEdge,
  isFirefox,
  isSafariDesktop,
  isSafariMobile,
  isSamsungBrowser,
  isTizen,
  isWebOs,
  isWebOs2021,
  isWebOs2022,
};
