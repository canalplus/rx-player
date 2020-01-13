/**
 * Copyright 2019 CANAL+ Group
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

import { IDBPDatabase } from "idb";

import arrayIncludes from "../../../utils/array_includes";
import MediaCapabilitiesProber from "../mediaCapabilitiesProber";
import { IMediaKeySystemConfiguration } from "../mediaCapabilitiesProber/types";
import { IActiveDownload } from "./api/context/types";
import { IApiLoader, IStoredManifest } from "./types";

/* tslint:disable */

/**
 * A utils class that extends Error object to have custom class errors
 */
export class SegmentConstuctionError extends Error {
  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, SegmentConstuctionError.prototype);
    this.name = "SegmentConstructionError";
  }
}

export class ValidationArgsError extends Error {
  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, ValidationArgsError.prototype);
    this.name = "ValidationArgsError";
  }
}

export class RxPlayerError extends Error {
  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, RxPlayerError.prototype);
    this.name = "RxPlayerError";
  }
}

export class IndexDBError extends Error {
  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, IndexDBError.prototype);
    this.name = "IndexDBError";
  }
}
/* tslint:enable */

/**
 * Check the presence and validity of ISettingsDownloader arguments
 *
 * @param ISettingsDownloader - The arguments that the user of the lib provided
 * @returns ID - Return the ID that the download will use to store as a primary key
 *
 */
export async function checkInitDownloaderOptions(
  options: IApiLoader,
  db: IDBPDatabase
): Promise<string> {
  if (typeof options !== "object" || Object.keys(options).length < 0) {
    throw new ValidationArgsError(
      "You must at least specify these arguments: { url, contentID, transport }"
    );
  }

  const { url, transport } = options;
  if (url == null || url === "") {
    throw new ValidationArgsError("You must specify the url of the manifest");
  }

  if (!arrayIncludes(["smooth", "dash"], transport)) {
    throw new ValidationArgsError(
      "You must specify a transport protocol, value possible: smooth - dash"
    );
  }

  const nbDownload = await db.count("manifests");
  return String(nbDownload + 1);
}

export function checkForResumeAPausedMovie(
  manifest: IStoredManifest,
  activeDownloads: IActiveDownload
) {
  if (manifest == null) {
    throw new ValidationArgsError(
      "No content has been found with the given contentID"
    );
  }

  if (activeDownloads[manifest.contentID] != null) {
    throw new ValidationArgsError("The content is already downloading");
  }

  if (manifest.progress.percentage === 100) {
    throw new ValidationArgsError(
      "You can't resume a content that is already fully downloaded"
    );
  }
}

export function checkForPauseAMovie(contentID: string) {
  if (contentID == null || contentID === "") {
    throw new ValidationArgsError(
      "A valid contentID is mandatory when pausing"
    );
  }
}

// DRM Capabilities:

// Key Systems
const CENC_KEY_SYSTEMS = [
  "com.widevine.alpha",
  "com.microsoft.playready.software",
  "com.apple.fps.1_0",
  "com.chromecast.playready",
  "com.youtube.playready",
];

// Robustness ONLY FOR WIDEVINE
const WIDEVINE_ROBUSTNESSES = [
  "HW_SECURE_ALL",
  "HW_SECURE_DECODE",
  "HW_SECURE_CRYPTO",
  "SW_SECURE_DECODE",
  "SW_SECURE_CRYPTO",
];

/**
 * Construct the necessary configuration for getCompatibleDRMConfigurations() Prober tool
 *
 * @returns {Array.<{type: String, configuration: Object<MediaKeySystemConfiguration>}>}
 */
export function constructConfig(): Array<{
  type: string;
  configuration: IMediaKeySystemConfiguration;
}> {
  return CENC_KEY_SYSTEMS.map(keySystem => ({
    type: keySystem,
    configuration: getKeySystemConfigurations(keySystem),
  }));
}

/**
 * @param {string} keySystem
 * @returns {MediaKeySystemConfiguration[]}
 */
export function getKeySystemConfigurations(
  keySystem: string
): IMediaKeySystemConfiguration {
  const videoCapabilities: MediaKeySystemMediaCapability[] = [];
  const audioCapabilities: MediaKeySystemMediaCapability[] = [];
  const robustnesses =
    keySystem === "com.widevine.alpha"
      ? WIDEVINE_ROBUSTNESSES
      : [undefined, undefined, undefined, undefined];

  robustnesses.forEach((robustness: string | undefined) => {
    videoCapabilities.push({
      contentType: "video/mp4;codecs='avc1.4d401e'", // standard mp4 codec
      robustness,
    });
    videoCapabilities.push({
      contentType: "video/mp4;codecs='avc1.42e01e'",
      robustness,
    });
    videoCapabilities.push({
      contentType: "video/webm;codecs='vp8'",
      robustness,
    });
    audioCapabilities.push({
      contentType: "audio/mp4;codecs='mp4a.40.2'", // standard mp4 codec
      robustness,
    });
  });

  return {
    initDataTypes: ["cenc"],
    videoCapabilities,
    audioCapabilities,
    persistentState: "required",
    sessionTypes: ["persistent-license"],
  };
}

function isFairplayDrmSupported(): boolean {
  const MK = (window as any).WebKitMediaKeys as {
    isTypeSupported: (drm: string, applicationType: string) => boolean;
  };
  const drm = "com.apple.fps.1_0";
  return (
    MK !== undefined &&
    MK.isTypeSupported !== undefined &&
    MK.isTypeSupported(drm, "video/mp4")
  );
}

function isSafari() {
  return (
    navigator.vendor !== undefined &&
    navigator.vendor.indexOf("Apple") > -1 &&
    navigator.userAgent !== undefined &&
    navigator.userAgent.indexOf("CriOS") === -1 &&
    navigator.userAgent.indexOf("FxiOS") === -1
  );
}

export async function isSupported(): Promise<boolean> {
  if (isSafari() && isFairplayDrmSupported()) {
    // We dont support (HLS/Fairplay) streaming right now :(
    return false;
  }

  const drmConfigs = await MediaCapabilitiesProber.getCompatibleDRMConfigurations(
    constructConfig()
  );
  return drmConfigs.some(
    drmConfig => drmConfig.compatibleConfiguration !== undefined
  );
}
