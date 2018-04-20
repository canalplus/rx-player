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

/**
 * Check if API are availables in current system/browsers.
 */

export function is_mediaCapabilities_APIAvailable(): Promise<{}> {
  return new Promise<{}>((resolve, reject) => {
    if (!("mediaCapabilities" in navigator)) {
      return reject("API_AVAILABILITY: MediaCapabilities API not available");
    }
    if (!("decodingInfo" in (navigator as any).mediaCapabilities)) {
      return reject("API_AVAILABILITY: Decoding Info not available");
    }
    resolve();
  });
}

export function is_isTypeSupportedWithFeatures_APIAvailable(): Promise<{}> {
  return new Promise<{}>((resolve, reject) => {
    if (!("MSMediaKeys" in window)) {
      return reject("API_AVAILABILITY: MSMediaKeys API not available");
    }
    if (!("isTypeSupportedWithFeatures" in (window as any).MSMediaKeys)) {
      return reject("API_AVAILABILITY: Decoding Info not available");
    }
    resolve();
  });
}

export function is_isTypeSupported_Available(): Promise<{}> {
  return new Promise<{}>((resolve, reject) => {
    if (!("MediaSource" in window)) {
      return reject("API_AVAILABILITY: MediaSource API not available");
    }
    if (!("isTypeSupported" in (window as any).MediaSource)) {
      return reject("API_AVAILABILITY: Decoding Info not available");
    }
    resolve();
  });
}

export function is_matchMedia_APIAvailable(): Promise<{}> {
  return new Promise<{}>((resolve, reject) => {
    if (!("matchMedia" in window)) {
      return reject("API_AVAILABILITY: matchMedia API not available");
    }
    resolve();
  });
}

export function is_requestMKSA_APIAvailable(): Promise<{}> {
  return new Promise<{}>((resolve, reject) => {
    if (!("requestMediaKeySystemAccess" in navigator)) {
      return reject("API_AVAILABILITY: requestMediaKeySystemAccess API not available");
    }
    resolve();
  });
}

export function is_getStatusForPolicy_APIAvailable(): Promise<{}> {
  return is_requestMKSA_APIAvailable().then(() => {
    return new Promise<{}>((resolve, reject) => {
      if (!("MediaKeys" in window)) {
        return reject("API_AVAILABILITY: MediaKeys API not available");
      }
      if (!("getStatusForPolicy" in (window as any).MediaKeys as any)) {
        return reject("API_AVAILABILITY: getStatusForPolicy API not available");
      }
      resolve();
    });
  });
}
