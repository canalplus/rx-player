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

export const SYSTEMS = {
  "clearkey":  ["webkit-org.w3.clearkey", "org.w3.clearkey"],
  "widevine":  ["com.widevine.alpha"],
  "playready": ["com.microsoft.playready", "com.chromecast.playready", "com.youtube.playready"],
};

// List of all eme security robustnesses from highest to lowest
export const DEFAULT_ROBUSTNESSES = [
  "HW_SECURE_ALL",
  "HW_SECURE_DECODE",
  "HW_SECURE_CRYPTO",
  "SW_SECURE_DECODE",
  "SW_SECURE_CRYPTO",
];

export const KEY_STATUS_ERRORS = {
  "expired": true,
  "internal-error": true,
   // "released",
   // "output-restricted",
   // "output-downscaled",
   // "status-pending",
};
