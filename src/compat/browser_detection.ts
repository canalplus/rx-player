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

/** Categorize a particular browser, without considering the current device. */
export const enum BrowserName {
  /**
   * Edge since it has been ported to chromium's engine.
   * chromium's engines.
   */
  EdgeChromium,
  /** Firefox Gecko-based browser, any engine. */
  Firefox,
  /** Internet Explorer 11 specifically. */
  Ie11,
  /**
   * Either Internet Explorer pre-11 or Microsoft Edge before Edge was ported on
   * chromium's engines.
   */
  OtherIeOrEdgePreEdgeChromium,
  /** Safari on Desktop devices (not mobile, tablets etc.). */
  SafariDesktop,
  /** Safari on mobile devices (not desktop). */
  SafariMobile,
  /** Another browser that does not match with the others defined here. */
  Other,
}

/**
 * Categorize a particular device, without considering the actual browser
 * running our code.
 */
export const enum DeviceName {
  /** Specific A1 STB: KSTB 40xx from Kaon Media. */
  A1KStb40xx,
  /** Panasonic smart TVs */
  Panasonic,
  /** Philips's NetTv browser. */
  PhilipsNetTv,
  /** The PlayStation 4 game console. */
  PlayStation4,
  /** The PlayStation 5 game console. */
  PlayStation5,
  /** Devices where Tizen is the OS (e.g. Samsung TVs). */
  Tizen,
  /** WebOS (mostly LG smart TVs) 2021 version. */
  WebOs2021,
  /** WebOS (mostly LG smart TVs) 2022 version. */
  WebOs2022,
  /** Other WebOS (mostly LG smart TVs) versions. */
  WebOsOther,
  /** The Xbox(es) game console(s). */
  Xbox,
  /** Another device that does not match with the others defined here. */
  Other,
}

/** Interface giving information on the current environment where the RxPlayer runs. */
export interface IEnvDetector {
  readonly browserName: BrowserName;
  readonly deviceName: DeviceName;
  /**
   * If `true`, we're on Samsung's own browser application
   * TODO: see how to merge it with either of the previous ones */
  readonly isSamsungBrowser: boolean;
}

/** Object giving information on the current environment where the RxPlayer runs. */
const EnvDetector = {
  browserName: BrowserName.Other,
  deviceName: DeviceName.Other,
  isSamsungBrowser: false,
  // BROWSER_NAMES: BrowserName,
  // DEVICE_NAMES: DeviceName,
};

(function findCurrentBrowser(): void {
  if (isNode) {
    return;
  }

  // 1 - Find out browser between IE/Edge Legacy/Edge Chromium/Firefox/Safari

  if (
    typeof (globalScope as IIE11WindowObject).MSInputMethodContext !== "undefined" &&
    typeof (document as IIE11Document).documentMode !== "undefined"
  ) {
    EnvDetector.browserName = BrowserName.Ie11;
  } else if (
    navigator.appName === "Microsoft Internet Explorer" ||
    (navigator.appName === "Netscape" && /(Trident|Edge)\//.test(navigator.userAgent))
  ) {
    EnvDetector.browserName = BrowserName.OtherIeOrEdgePreEdgeChromium;
  } else if (navigator.userAgent.toLowerCase().indexOf("edg/") !== -1) {
    EnvDetector.browserName = BrowserName.EdgeChromium;
  } else if (navigator.userAgent.toLowerCase().indexOf("firefox") !== -1) {
    EnvDetector.browserName = BrowserName.Firefox;
  } else if (
    typeof navigator.platform === "string" &&
    /iPad|iPhone|iPod/.test(navigator.platform)
  ) {
    EnvDetector.browserName = BrowserName.SafariMobile;
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
    EnvDetector.browserName = BrowserName.SafariDesktop;
  }

  // 2 - Find out specific device/platform information

  // Samsung browser e.g. on Android
  if (/SamsungBrowser/.test(navigator.userAgent)) {
    EnvDetector.isSamsungBrowser = true;
  }

  if (navigator.userAgent.indexOf("PlayStation 4") !== -1) {
    EnvDetector.deviceName = DeviceName.PlayStation4;
  } else if (navigator.userAgent.indexOf("PlayStation 5") !== -1) {
    EnvDetector.deviceName = DeviceName.PlayStation5;
  } else if (/Tizen/.test(navigator.userAgent)) {
    EnvDetector.deviceName = DeviceName.Tizen;

    // Inspired form: http://webostv.developer.lge.com/discover/specifications/web-engine/
    // Note: even that page doesn't correspond to what we've actually seen in the
    // wild
  } else if (/[Ww]eb[O0]S/.test(navigator.userAgent)) {
    if (
      /[Ww]eb[O0]S.TV-2022/.test(navigator.userAgent) ||
      /[Cc]hr[o0]me\/87/.test(navigator.userAgent)
    ) {
      EnvDetector.deviceName = DeviceName.WebOs2022;
    } else if (
      /[Ww]eb[O0]S.TV-2021/.test(navigator.userAgent) ||
      /[Cc]hr[o0]me\/79/.test(navigator.userAgent)
    ) {
      EnvDetector.deviceName = DeviceName.WebOs2021;
    } else {
      EnvDetector.deviceName = DeviceName.WebOsOther;
    }
  } else if (
    navigator.userAgent.indexOf("NETTV") !== -1 &&
    navigator.userAgent.indexOf("Philips") !== -1
  ) {
    EnvDetector.deviceName = DeviceName.PhilipsNetTv;
  } else if (/[Pp]anasonic/.test(navigator.userAgent)) {
    EnvDetector.deviceName = DeviceName.Panasonic;
  } else if (navigator.userAgent.indexOf("Xbox") !== -1) {
    EnvDetector.deviceName = DeviceName.Xbox;
  } else if (navigator.userAgent.indexOf("Model/a1-kstb40xx") !== -1) {
    EnvDetector.deviceName = DeviceName.A1KStb40xx;
  }
})();
export default EnvDetector as IEnvDetector;
