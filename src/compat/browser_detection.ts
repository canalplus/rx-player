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

import globalScope from "../utils/global_scope";
import isNode from "../utils/is_node";

type GlobalScope = typeof globalScope;

interface IIE11WindowObject extends GlobalScope {
  MSInputMethodContext?: unknown;
}

interface IIE11Document extends Document {
  documentMode?: unknown;
}

interface ISafariWindowObject extends GlobalScope {
  safari?: { pushNotification?: { toString(): string } };
}

/** Edge Chromium, regardless of the device */
let isEdgeChromium = false;

/** IE11, regardless of the device */
let isIE11 = false;

/** IE11 or Edge __Legacy__ (not Edge Chromium), regardless of the device */
let isIEOrEdge = false;

/** Firefox, regardless of the device */
let isFirefox = false;

/** `true` on Safari on a PC platform (i.e. not iPhone / iPad etc.) */
let isSafariDesktop = false;

/** `true` on Safari on an iPhone, iPad & iPod platform */
let isSafariMobile = false;

/** Samsung's own browser application */
let isSamsungBrowser = false;

/** `true` on devices where Tizen is the OS (e.g. Samsung TVs). */
let isTizen = false;

/** `true` on devices where WebOS is the OS (e.g. LG TVs). */
let isWebOs = false;

/** `true` specifically for WebOS 2021 version. */
let isWebOs2021 = false;

/** `true` specifically for WebOS 2022 version. */
let isWebOs2022 = false;

/** `true` for Panasonic devices. */
let isPanasonic = false;

/** `true` for the PlayStation 4 game console. */
let isPlayStation4 = false;

/** `true` for the PlayStation 5 game console. */
let isPlayStation5 = false;

/** `true` for the Xbox game consoles. */
let isXbox = false;

(function findCurrentBrowser(): void {
  if (isNode) {
    return;
  }

  // 1 - Find out browser between IE/Edge Legacy/Edge Chromium/Firefox/Safari

  if (
    typeof (globalScope as IIE11WindowObject).MSInputMethodContext !== "undefined" &&
    typeof (document as IIE11Document).documentMode !== "undefined"
  ) {
    isIE11 = true;
    isIEOrEdge = true;
  } else if (
    navigator.appName === "Microsoft Internet Explorer" ||
    (navigator.appName === "Netscape" && /(Trident|Edge)\//.test(navigator.userAgent))
  ) {
    isIEOrEdge = true;
  } else if (navigator.userAgent.toLowerCase().indexOf("edg/") !== -1) {
    isEdgeChromium = true;
  } else if (navigator.userAgent.toLowerCase().indexOf("firefox") !== -1) {
    isFirefox = true;
  } else if (
    typeof navigator.platform === "string" &&
    /iPad|iPhone|iPod/.test(navigator.platform)
  ) {
    isSafariMobile = true;
  } else if (
    // the following statement check if the window.safari contains the method
    // "pushNotification", this condition is not met when using web app from the dock
    // on macOS, this is why we also check userAgent.
    Object.prototype.toString.call(globalScope.HTMLElement).indexOf("Constructor") >= 0 ||
    (globalScope as ISafariWindowObject).safari?.pushNotification?.toString() ===
      "[object SafariRemoteNotification]" ||
    // browsers are lying: Chrome reports both as Chrome and Safari in user
    // agent string, So to detect Safari we have to check for the Safari string
    // and the absence of the Chrome string
    // @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Browser_detection_using_the_user_agent#which_part_of_the_user_agent_contains_the_information_you_are_looking_for
    (/Safari\/(\d+)/.test(navigator.userAgent) &&
      // Safari should contain Version/ in userAgent
      /Version\/(\d+)/.test(navigator.userAgent) &&
      navigator.vendor?.indexOf("Apple") !== -1 &&
      !/Chrome\/(\d+)/.test(navigator.userAgent) &&
      !/Chromium\/(\d+)/.test(navigator.userAgent))
  ) {
    isSafariDesktop = true;
  }

  // 2 - Find out specific device/platform information

  // Samsung browser e.g. on Android
  if (/SamsungBrowser/.test(navigator.userAgent)) {
    isSamsungBrowser = true;
  }

  if (navigator.userAgent.indexOf("PlayStation 4") !== -1) {
    isPlayStation4 = true;
  } else if (navigator.userAgent.indexOf("PlayStation 5") !== -1) {
    isPlayStation5 = true;
  } else if (/Tizen/.test(navigator.userAgent)) {
    isTizen = true;

    // Inspired form: http://webostv.developer.lge.com/discover/specifications/web-engine/
    // Note: even that page doesn't correspond to what we've actually seen in the
    // wild
  } else if (/[Ww]eb[O0]S/.test(navigator.userAgent)) {
    isWebOs = true;

    if (
      /[Ww]eb[O0]S.TV-2022/.test(navigator.userAgent) ||
      /[Cc]hr[o0]me\/87/.test(navigator.userAgent)
    ) {
      isWebOs2022 = true;
    } else if (
      /[Ww]eb[O0]S.TV-2021/.test(navigator.userAgent) ||
      /[Cc]hr[o0]me\/79/.test(navigator.userAgent)
    ) {
      isWebOs2021 = true;
    }
  } else if (/[Pp]anasonic/.test(navigator.userAgent)) {
    isPanasonic = true;
  } else if (navigator.userAgent.indexOf("Xbox") !== -1) {
    isXbox = true;
  }
})();

export {
  isEdgeChromium,
  isIE11,
  isIEOrEdge,
  isFirefox,
  isPanasonic,
  isPlayStation4,
  isPlayStation5,
  isXbox,
  isSafariDesktop,
  isSafariMobile,
  isSamsungBrowser,
  isTizen,
  isWebOs,
  isWebOs2021,
  isWebOs2022,
};
