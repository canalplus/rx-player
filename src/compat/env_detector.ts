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

import globalScope from "../utils/global_scope.ts";
import isNode from "../utils/is_node.ts";

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

/** List of detected browsers. */
const BROWSERS = {
  /** Edge since it has been ported to chromium's engine. */
  EdgeChromium: 0,
  /** Firefox Gecko-based browser, any engine. */
  Firefox: 1,
  /** Internet Explorer 11 specifically. */
  Ie11: 2,
  /**
   * Either Internet Explorer pre-11 or Microsoft Edge before Edge was ported on
   * chromium's engines.
   */
  OtherIeOrEdgePreEdgeChromium: 3,
  /** Safari on Desktop devices (not mobile, tablets etc.). */
  SafariDesktop: 4,
  /** Safari on mobile devices (not desktop). */
  SafariMobile: 5,
  /** Another browser that does not match with the others defined here. */
  Other: 6,
} as const;

/** List of detected devices. */
const DEVICES = {
  // NOTE: We're beginning the first devices at `100` so we're sure ther's no
  // overlap with BROWSERS: we can then rely on TypeScript to ensure that
  // developers are not mistakenly comparing BROWSERS to DEVICES.

  /** Specific A1 STB: KSTB 40xx from Kaon Media. */
  A1KStb40xx: 100,
  /** Panasonic smart TVs */
  Panasonic: 101,
  /** Philips's NetTv browser. */
  PhilipsNetTv: 102,
  /** The PlayStation 4 game console. */
  PlayStation4: 103,
  /** The PlayStation 5 game console. */
  PlayStation5: 104,
  /** Devices where Tizen is the OS (e.g. Samsung TVs). */
  Tizen: 105,
  /** WebOS (mostly LG smart TVs) 2021 version. */
  WebOs2021: 106,
  /** WebOS (mostly LG smart TVs) 2022 version. */
  WebOs2022: 107,
  /** Other WebOS (mostly LG smart TVs) versions. */
  WebOsOther: 108,
  /** The Xbox(es) game console(s). */
  Xbox: 109,
  /** Another device that does not match with the others defined here. */
  Other: 110,
  /** DSTtv's Streama STB MPD1001S, which is known to have some quirks. */
  StreamaMdp1001S: 111,
  /** Hisense manufacturer */
  Hisense: 112,
} as const;

/** Interface giving information on the current environment where the RxPlayer runs. */
export interface IEnvDetector {
  /** List of all browsers that can be set to the `browser` property */
  BROWSERS: typeof BROWSERS;
  /** List of all devices that can be set to the `device` property */
  DEVICES: typeof DEVICES;

  /** Categorize a particular browser, without considering the current device. */
  readonly browser: (typeof BROWSERS)[keyof typeof BROWSERS];

  /**
   * Categorize a particular device, without considering the actual browser
   * running our code.
   */
  readonly device: (typeof DEVICES)[keyof typeof DEVICES];

  /**
   * If `true`, we're on Samsung's own browser application
   * TODO: see how to merge it with either of the previous ones */
  readonly isSamsungBrowser: boolean;
}

/** Object giving information on the current environment where the RxPlayer runs. */
const EnvDetector = {
  DEVICES,
  BROWSERS,
  browser: BROWSERS.Other as (typeof BROWSERS)[keyof typeof BROWSERS],
  device: DEVICES.Other as (typeof DEVICES)[keyof typeof DEVICES],
  isSamsungBrowser: false,
};

resetEnvironment();

/**
 * Force `EnvDetector` to report the indicated environment, so other player
 * modules believe they are on another device.
 *
 * This method should only be relied on by tests.
 * @param {number} browser
 * @param {number} device
 * @returns {function} - Function allowing to reset the `EnvDetector`'s actual
 * properties.
 */
export function mockEnvironment(
  browser: (typeof BROWSERS)[keyof typeof BROWSERS],
  device: (typeof DEVICES)[keyof typeof DEVICES],
  isSamsungBrowser: boolean = false,
): () => void {
  EnvDetector.browser = browser;
  EnvDetector.device = device;
  EnvDetector.isSamsungBrowser = isSamsungBrowser;
  return resetEnvironment;
}

/**
 * Reset `EnvDetector` to its regular state.
 * You want to call this if you mocked an environment with the
 * `mockEnvironment` function and want to reset the `EnvDetector` to its actual
 * value.
 */
function resetEnvironment(): void {
  if (isNode) {
    return;
  }

  // 1 - Find out browser between IE/Edge Legacy/Edge Chromium/Firefox/Safari

  if (
    typeof (globalScope as IIE11WindowObject).MSInputMethodContext !== "undefined" &&
    typeof (document as IIE11Document).documentMode !== "undefined"
  ) {
    EnvDetector.browser = BROWSERS.Ie11;
  } else if (
    navigator.appName === "Microsoft Internet Explorer" ||
    (navigator.appName === "Netscape" && /(Trident|Edge)\//.test(navigator.userAgent))
  ) {
    EnvDetector.browser = BROWSERS.OtherIeOrEdgePreEdgeChromium;
  } else if (navigator.userAgent.toLowerCase().indexOf("edg/") !== -1) {
    EnvDetector.browser = BROWSERS.EdgeChromium;
  } else if (navigator.userAgent.toLowerCase().indexOf("firefox") !== -1) {
    EnvDetector.browser = BROWSERS.Firefox;
  } else if (
    typeof navigator.platform === "string" &&
    /iPad|iPhone|iPod/.test(navigator.platform)
  ) {
    EnvDetector.browser = BROWSERS.SafariMobile;
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
    EnvDetector.browser = BROWSERS.SafariDesktop;
  }

  // 2 - Find out specific device/platform information

  // Samsung browser e.g. on Android
  if (/SamsungBrowser/.test(navigator.userAgent)) {
    EnvDetector.isSamsungBrowser = true;
  }

  if (navigator.userAgent.indexOf("PlayStation 4") !== -1) {
    EnvDetector.device = DEVICES.PlayStation4;
  } else if (navigator.userAgent.indexOf("PlayStation 5") !== -1) {
    EnvDetector.device = DEVICES.PlayStation5;
  } else if (navigator.userAgent.indexOf("DStv Streama, MDMP1001S") !== -1) {
    EnvDetector.device = DEVICES.StreamaMdp1001S;
  } else if (/Tizen/.test(navigator.userAgent)) {
    EnvDetector.device = DEVICES.Tizen;

    // Inspired form: http://webostv.developer.lge.com/discover/specifications/web-engine/
    // Note: even that page doesn't correspond to what we've actually seen in the
    // wild
  } else if (/[Ww]eb[O0]S/.test(navigator.userAgent)) {
    if (
      /[Ww]eb[O0]S.TV-2022/.test(navigator.userAgent) ||
      /[Cc]hr[o0]me\/87/.test(navigator.userAgent)
    ) {
      EnvDetector.device = DEVICES.WebOs2022;
    } else if (
      /[Ww]eb[O0]S.TV-2021/.test(navigator.userAgent) ||
      /[Cc]hr[o0]me\/79/.test(navigator.userAgent)
    ) {
      EnvDetector.device = DEVICES.WebOs2021;
    } else {
      EnvDetector.device = DEVICES.WebOsOther;
    }
  } else if (
    navigator.userAgent.indexOf("NETTV") !== -1 &&
    navigator.userAgent.indexOf("Philips") !== -1
  ) {
    EnvDetector.device = DEVICES.PhilipsNetTv;
  } else if (
    navigator.userAgent.indexOf("Hisense") !== -1 &&
    navigator.userAgent.indexOf("VIDAA") !== -1
  ) {
    EnvDetector.device = DEVICES.Hisense;
  } else if (/[Pp]anasonic/.test(navigator.userAgent)) {
    EnvDetector.device = DEVICES.Panasonic;
  } else if (navigator.userAgent.indexOf("Xbox") !== -1) {
    EnvDetector.device = DEVICES.Xbox;
  } else if (navigator.userAgent.indexOf("Model/a1-kstb40xx") !== -1) {
    EnvDetector.device = DEVICES.A1KStb40xx;
  }
}

export { resetEnvironment };
export default EnvDetector as IEnvDetector;
