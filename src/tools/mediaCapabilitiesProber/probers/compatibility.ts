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
  return new Promise((resolve) => {
    if (!("mediaCapabilities" in navigator)) {
      throw new Error("MediaCapabilitiesProber >>> API_CALL: " +
        "MediaCapabilities API not available");
    }
    if (!("decodingInfo" in (navigator as any).mediaCapabilities)) {
      throw new Error("MediaCapabilitiesProber >>> API_CALL: " +
        "Decoding Info not available");
    }
    resolve();
  });
}

export function is_isTypeSupportedWithFeatures_APIAvailable(): Promise<void> {
  return new Promise((resolve) => {
    if (!("MSMediaKeys" in window)) {
      throw new Error("MediaCapabilitiesProber >>> API_CALL: " +
        "MSMediaKeys API not available");
    }
    if (!("isTypeSupportedWithFeatures" in (window as any).MSMediaKeys)) {
      throw new Error("MediaCapabilitiesProber >>> API_CALL: " +
        "Decoding Info not available");
    }
    resolve();
  });
}

export function is_isTypeSupported_Available(): Promise<void> {
  return new Promise((resolve) => {
    if (!("MediaSource" in window)) {
      throw new Error("MediaCapabilitiesProber >>> API_CALL: " +
        "MediaSource API not available");
    }
    if (!("isTypeSupported" in (window as any).MediaSource)) {
      throw new Error("MediaCapabilitiesProber >>> API_CALL: " +
        "Decoding Info not available");
    }
    resolve();
  });
}

export function is_matchMedia_APIAvailable(): Promise<void> {
  return new Promise((resolve) => {
    if (!("matchMedia" in window)) {
      throw new Error("MediaCapabilitiesProber >>> API_CALL: " +
        "matchMedia API not available");
    }
    resolve();
  });
}

export function is_requestMKSA_APIAvailable(): Promise<void> {
  return new Promise((resolve) => {
    if (!("requestMediaKeySystemAccess" in navigator)) {
      throw new Error("API_AVAILABILITY: MediaCapabilitiesProber >>> API_CALL: " +
        "API not available");
    }
    resolve();
  });
}

export function is_getStatusForPolicy_APIAvailable(): Promise<void> {
  return is_requestMKSA_APIAvailable().then(() => {
    if (!("MediaKeys" in window)) {
      throw new Error("MediaCapabilitiesProber >>> API_CALL: " +
        "MediaKeys API not available");
    }
    if (!("getStatusForPolicy" in (window as any).MediaKeys as any)) {
      throw new Error("MediaCapabilitiesProber >>> API_CALL: " +
        "getStatusForPolicy API not available");
    }
  });
}
