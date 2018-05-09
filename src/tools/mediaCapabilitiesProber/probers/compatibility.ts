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

export function is_mediaCapabilities_APIAvailable(): Promise<void> {
  if (!("mediaCapabilities" in navigator)) {
    return Promise.reject("API_AVAILABILITY: MediaCapabilities API not available");
  }
  if (!("decodingInfo" in (navigator as any).mediaCapabilities)) {
    return Promise.reject("API_AVAILABILITY: Decoding Info not available");
  }
  return Promise.resolve();
}

export function is_isTypeSupportedWithFeatures_APIAvailable(): Promise<void> {
  if (!("MSMediaKeys" in window)) {
    return Promise.reject("API_AVAILABILITY: MSMediaKeys API not available");
  }
  if (!("isTypeSupportedWithFeatures" in (window as any).MSMediaKeys)) {
    return Promise.reject("API_AVAILABILITY: Decoding Info not available");
  }
  return Promise.resolve();
}

export function is_isTypeSupported_Available(): Promise<void> {
  if (!("MediaSource" in window)) {
    return Promise.reject("API_AVAILABILITY: MediaSource API not available");
  }
  if (!("isTypeSupported" in (window as any).MediaSource)) {
    return Promise.reject("API_AVAILABILITY: Decoding Info not available");
  }
  return Promise.resolve();
}

export function is_matchMedia_APIAvailable(): Promise<void> {
  if (!("matchMedia" in window)) {
    return Promise.reject("API_AVAILABILITY: matchMedia API not available");
  }
  return Promise.resolve();
}

export function is_requestMKSA_APIAvailable(): Promise<void> {
  if (!("requestMediaKeySystemAccess" in navigator)) {
    return Promise.reject(
      "API_AVAILABILITY: requestMediaKeySystemAccess API not available");
  }
  return Promise.resolve();
}

export function is_getStatusForPolicy_APIAvailable(): Promise<void> {
  return is_requestMKSA_APIAvailable().then(() => {
    if (!("MediaKeys" in window)) {
      return Promise.reject("API_AVAILABILITY: MediaKeys API not available");
    }
    if (!("getStatusForPolicy" in (window as any).MediaKeys as any)) {
      return Promise.reject("API_AVAILABILITY: getStatusForPolicy API not available");
    }
    return Promise.resolve();
  });
}
