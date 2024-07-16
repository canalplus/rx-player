"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.isWebOs2022 = exports.isWebOs2021 = exports.isWebOs = exports.isTizen = exports.isSamsungBrowser = exports.isSafariMobile = exports.isSafariDesktop = exports.isXbox = exports.isPlayStation5 = exports.isPlayStation4 = exports.isPanasonic = exports.isFirefox = exports.isIEOrEdge = exports.isIE11 = exports.isEdgeChromium = void 0;
var global_scope_1 = require("../utils/global_scope");
var is_node_1 = require("../utils/is_node");
/** Edge Chromium, regardless of the device */
var isEdgeChromium = false;
exports.isEdgeChromium = isEdgeChromium;
/** IE11, regardless of the device */
var isIE11 = false;
exports.isIE11 = isIE11;
/** IE11 or Edge __Legacy__ (not Edge Chromium), regardless of the device */
var isIEOrEdge = false;
exports.isIEOrEdge = isIEOrEdge;
/** Firefox, regardless of the device */
var isFirefox = false;
exports.isFirefox = isFirefox;
/** `true` on Safari on a PC platform (i.e. not iPhone / iPad etc.) */
var isSafariDesktop = false;
exports.isSafariDesktop = isSafariDesktop;
/** `true` on Safari on an iPhone, iPad & iPod platform */
var isSafariMobile = false;
exports.isSafariMobile = isSafariMobile;
/** Samsung's own browser application */
var isSamsungBrowser = false;
exports.isSamsungBrowser = isSamsungBrowser;
/** `true` on devices where Tizen is the OS (e.g. Samsung TVs). */
var isTizen = false;
exports.isTizen = isTizen;
/** `true` on devices where WebOS is the OS (e.g. LG TVs). */
var isWebOs = false;
exports.isWebOs = isWebOs;
/** `true` specifically for WebOS 2021 version. */
var isWebOs2021 = false;
exports.isWebOs2021 = isWebOs2021;
/** `true` specifically for WebOS 2022 version. */
var isWebOs2022 = false;
exports.isWebOs2022 = isWebOs2022;
/** `true` for Panasonic devices. */
var isPanasonic = false;
exports.isPanasonic = isPanasonic;
/** `true` for the PlayStation 4 game console. */
var isPlayStation4 = false;
exports.isPlayStation4 = isPlayStation4;
/** `true` for the PlayStation 5 game console. */
var isPlayStation5 = false;
exports.isPlayStation5 = isPlayStation5;
/** `true` for the Xbox game consoles. */
var isXbox = false;
exports.isXbox = isXbox;
(function findCurrentBrowser() {
    var _a, _b, _c;
    if (is_node_1.default) {
        return;
    }
    // 1 - Find out browser between IE/Edge Legacy/Edge Chromium/Firefox/Safari
    if (typeof global_scope_1.default.MSInputMethodContext !== "undefined" &&
        typeof document.documentMode !== "undefined") {
        exports.isIE11 = isIE11 = true;
        exports.isIEOrEdge = isIEOrEdge = true;
    }
    else if (navigator.appName === "Microsoft Internet Explorer" ||
        (navigator.appName === "Netscape" && /(Trident|Edge)\//.test(navigator.userAgent))) {
        exports.isIEOrEdge = isIEOrEdge = true;
    }
    else if (navigator.userAgent.toLowerCase().indexOf("edg/") !== -1) {
        exports.isEdgeChromium = isEdgeChromium = true;
    }
    else if (navigator.userAgent.toLowerCase().indexOf("firefox") !== -1) {
        exports.isFirefox = isFirefox = true;
    }
    else if (typeof navigator.platform === "string" &&
        /iPad|iPhone|iPod/.test(navigator.platform)) {
        exports.isSafariMobile = isSafariMobile = true;
    }
    else if (
    // the following statement check if the window.safari contains the method
    // "pushNotification", this condition is not met when using web app from the dock
    // on macOS, this is why we also check userAgent.
    Object.prototype.toString.call(global_scope_1.default.HTMLElement).indexOf("Constructor") >= 0 ||
        ((_b = (_a = global_scope_1.default.safari) === null || _a === void 0 ? void 0 : _a.pushNotification) === null || _b === void 0 ? void 0 : _b.toString()) ===
            "[object SafariRemoteNotification]" ||
        // browsers are lying: Chrome reports both as Chrome and Safari in user
        // agent string, So to detect Safari we have to check for the Safari string
        // and the absence of the Chrome string
        // @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Browser_detection_using_the_user_agent#which_part_of_the_user_agent_contains_the_information_you_are_looking_for
        (/Safari\/(\d+)/.test(navigator.userAgent) &&
            // Safari should contain Version/ in userAgent
            /Version\/(\d+)/.test(navigator.userAgent) &&
            ((_c = navigator.vendor) === null || _c === void 0 ? void 0 : _c.indexOf("Apple")) !== -1 &&
            !/Chrome\/(\d+)/.test(navigator.userAgent) &&
            !/Chromium\/(\d+)/.test(navigator.userAgent))) {
        exports.isSafariDesktop = isSafariDesktop = true;
    }
    // 2 - Find out specific device/platform information
    // Samsung browser e.g. on Android
    if (/SamsungBrowser/.test(navigator.userAgent)) {
        exports.isSamsungBrowser = isSamsungBrowser = true;
    }
    if (navigator.userAgent.indexOf("PlayStation 4") !== -1) {
        exports.isPlayStation4 = isPlayStation4 = true;
    }
    else if (navigator.userAgent.indexOf("PlayStation 5") !== -1) {
        exports.isPlayStation5 = isPlayStation5 = true;
    }
    else if (/Tizen/.test(navigator.userAgent)) {
        exports.isTizen = isTizen = true;
        // Inspired form: http://webostv.developer.lge.com/discover/specifications/web-engine/
        // Note: even that page doesn't correspond to what we've actually seen in the
        // wild
    }
    else if (/[Ww]eb[O0]S/.test(navigator.userAgent)) {
        exports.isWebOs = isWebOs = true;
        if (/[Ww]eb[O0]S.TV-2022/.test(navigator.userAgent) ||
            /[Cc]hr[o0]me\/87/.test(navigator.userAgent)) {
            exports.isWebOs2022 = isWebOs2022 = true;
        }
        else if (/[Ww]eb[O0]S.TV-2021/.test(navigator.userAgent) ||
            /[Cc]hr[o0]me\/79/.test(navigator.userAgent)) {
            exports.isWebOs2021 = isWebOs2021 = true;
        }
    }
    else if (/[Pp]anasonic/.test(navigator.userAgent)) {
        exports.isPanasonic = isPanasonic = true;
    }
    else if (navigator.userAgent.indexOf("Xbox") !== -1) {
        exports.isXbox = isXbox = true;
    }
})();
