import { isSafariMobile, isSafariDesktop } from "../../../compat/browser_detection";
import MediaCapabilitiesProber from "../mediaCapabilitiesProber";
import { IMediaKeySystemConfiguration } from "../mediaCapabilitiesProber/types";
import { IActiveDownload } from "./api/tracksPicker/types";
import { IStoredManifest } from "./types";

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

export class RxPlayerError extends Error {
  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, RxPlayerError.prototype);
    this.name = "RxPlayerError";
  }
}

export class IndexedDBError extends Error {
  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, IndexedDBError.prototype);
    this.name = "IndexedDBError";
  }
}

/**
 * Assert a resume of a download
 *
 * @param {IStoredManifest} manifest The stored manifest in IndexedDB
 * @param {IActiveDownload} activeDownloads An object of active downloads
 *
 */
export function assertResumeADownload(
  manifest: IStoredManifest,
  activeDownloads: IActiveDownload,
): void {
  if (manifest === null || manifest === undefined) {
    throw new ValidationArgsError("No content has been found with the given contentId");
  }

  if (activeDownloads[manifest.contentId] !== undefined) {
    throw new ValidationArgsError("The content is already downloading");
  }

  if (manifest.progress.percentage === 100) {
    throw new ValidationArgsError(
      "You can't resume a content that is already fully downloaded",
    );
  }
}

export function assertValidContentId(contentId: string) {
  if (contentId === null || typeof contentId !== "string" || contentId === "") {
    throw new Error("Invalid `contentId` format.");
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
export function getMediaKeySystemConfiguration(): Array<{
  type: string;
  configuration: IMediaKeySystemConfiguration;
}> {
  return CENC_KEY_SYSTEMS.map((keySystem) => ({
    type: keySystem,
    configuration: getKeySystemConfigurations(keySystem),
  }));
}

/**
 * @param {string} keySystem
 * @returns {MediaKeySystemConfiguration[]}
 */
export function getKeySystemConfigurations(
  keySystem: string,
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
      ...(robustness === undefined ? {} : { robustness }),
    });
    videoCapabilities.push({
      contentType: "video/mp4;codecs='avc1.42e01e'",
      ...(robustness === undefined ? {} : { robustness }),
    });
    videoCapabilities.push({
      contentType: "video/webm;codecs='vp8'",
      ...(robustness === undefined ? {} : { robustness }),
    });
    audioCapabilities.push({
      contentType: "audio/mp4;codecs='mp4a.40.2'", // standard mp4 codec
      ...(robustness === undefined ? {} : { robustness }),
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
  const MK = (
    window as typeof window & {
      WebKitMediaKeys?:
        | {
            isTypeSupported: (drm: string, applicationType: string) => boolean;
          }
        | undefined;
    }
  ).WebKitMediaKeys;
  const drm = "com.apple.fps.1_0";
  return (
    MK !== undefined &&
    MK.isTypeSupported !== undefined &&
    MK.isTypeSupported(drm, "video/mp4")
  );
}

/**
 * Detect if the current environment is supported for persistent licence
 *
 * @returns {boolean} - is supported
 *
 */
export async function isPersistentLicenseSupported(): Promise<boolean> {
  if (isSafariMobile || (isSafariDesktop && isFairplayDrmSupported())) {
    // We dont support (HLS/Fairplay) streaming right now :(
    return false;
  }

  const drmConfigs = await MediaCapabilitiesProber.getCompatibleDRMConfigurations(
    getMediaKeySystemConfiguration(),
  );
  return drmConfigs.some((drmConfig) => drmConfig.compatibleConfiguration !== undefined);
}
