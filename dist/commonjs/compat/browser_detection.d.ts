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
/** Edge Chromium, regardless of the device */
declare let isEdgeChromium: boolean;
/** IE11, regardless of the device */
declare let isIE11: boolean;
/** IE11 or Edge __Legacy__ (not Edge Chromium), regardless of the device */
declare let isIEOrEdge: boolean;
/** Firefox, regardless of the device */
declare let isFirefox: boolean;
/** `true` on Safari on a PC platform (i.e. not iPhone / iPad etc.) */
declare let isSafariDesktop: boolean;
/** `true` on Safari on an iPhone, iPad & iPod platform */
declare let isSafariMobile: boolean;
/** Samsung's own browser application */
declare let isSamsungBrowser: boolean;
/** `true` on devices where Tizen is the OS (e.g. Samsung TVs). */
declare let isTizen: boolean;
/** `true` on devices where WebOS is the OS (e.g. LG TVs). */
declare let isWebOs: boolean;
/** `true` specifically for WebOS 2021 version. */
declare let isWebOs2021: boolean;
/** `true` specifically for WebOS 2022 version. */
declare let isWebOs2022: boolean;
/** `true` for Panasonic devices. */
declare let isPanasonic: boolean;
/** `true` for the PlayStation 5 game console. */
declare let isPlayStation5: boolean;
/** `true` for the Xbox game consoles. */
declare let isXbox: boolean;
export { isEdgeChromium, isIE11, isIEOrEdge, isFirefox, isPanasonic, isPlayStation5, isXbox, isSafariDesktop, isSafariMobile, isSamsungBrowser, isTizen, isWebOs, isWebOs2021, isWebOs2022, };
