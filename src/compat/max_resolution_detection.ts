import log from "../log";
import globalScope from "../utils/global_scope";
import isNullOrUndefined from "../utils/is_null_or_undefined";
import { isHisense, isTizen, isWebOs } from "./browser_detection";

interface IWebOsDeviceCallback {
  modelName: string;
  modelNameAscii: string;
  version: string;
  versionMajor: number;
  versionMinor: number;
  versionDot: number;
  sdkVersion: string;
  screenWidth: number;
  screenHeight: number;
  uhd?: boolean;
}

type IVendorGlobalScope = typeof globalScope & {
  /** On Hisense TVs. */
  // eslint-disable-next-line @typescript-eslint/naming-convention
  Hisense_Get4KSupportState?: (() => boolean) | null | undefined;
  /** On Tizen devices. */
  webapis?:
    | {
        productinfo?:
          | {
              is8KPanelSupported?: (() => boolean) | null | undefined;
              isUdPanelSupported?: (() => boolean) | null | undefined;
            }
          | null
          | undefined;
      }
    | null
    | undefined;
  /** On LG TVs. */
  // eslint-disable-next-line @typescript-eslint/naming-convention
  PalmSystem?:
    | {
        deviceInfo?: string | null | undefined;
      }
    | null
    | undefined;
  /** Also on LG TVs. */
  webOS?:
    | {
        deviceInfo:
          | ((cb: (arg: IWebOsDeviceCallback) => void) => void)
          | null
          | undefined;
      }
    | null
    | undefined;
};
const global: IVendorGlobalScope = globalScope;

export default function getMaxSupportedResolution(): {
  width?: number | undefined;
  height: number | undefined;
} {
  try {
    if (isHisense) {
      if (
        navigator.userAgent.indexOf(";FHD") >= 0 ||
        navigator.userAgent.indexOf("/FHD") >= 0
      ) {
        return {
          height: 1080,
          width: undefined,
        };
      }
      if (
        navigator.userAgent.indexOf(";HD") >= 0 ||
        navigator.userAgent.indexOf("/HD") >= 0
      ) {
        return {
          height: 720,
          width: undefined,
        };
      }
      // Found in VIDAA Web developer documentation
      if (
        "Hisense_Get4KSupportState" in global &&
        typeof global.Hisense_Get4KSupportState === "function"
      ) {
        if (global.Hisense_Get4KSupportState()) {
          return {
            height: undefined,
            width: undefined,
          };
        }
      }
    }

    if (isTizen) {
      if (
        !isNullOrUndefined(global.webapis) &&
        !isNullOrUndefined(global.webapis.productinfo)
      ) {
        if (typeof global.webapis.productinfo.is8KPanelSupported === "function") {
          return {
            height: undefined,
            width: undefined,
          };
        }
        if (typeof global.webapis.productinfo.isUdPanelSupported === "function") {
          return {
            height: 3840,
            width: 2160,
          };
        }
      }
    }

    if (isWebOs) {
      let deviceInfo: IWebOsDeviceCallback | null | undefined;
      if (
        !isNullOrUndefined(global.PalmSystem) &&
        typeof global.PalmSystem.deviceInfo === "string"
      ) {
        deviceInfo = JSON.parse(global.PalmSystem.deviceInfo) as IWebOsDeviceCallback;
      }
      if (
        !isNullOrUndefined(global.webOS) &&
        typeof global.webOS.deviceInfo === "function"
      ) {
        global.webOS.deviceInfo((info: IWebOsDeviceCallback) => {
          deviceInfo = info;
        });
      }
      if (!isNullOrUndefined(deviceInfo)) {
        if (deviceInfo.uhd === true) {
          return {
            width: undefined,
            height: undefined,
          };
        }
        if (
          "screenWidth" in deviceInfo &&
          typeof deviceInfo.screenWidth === "number" &&
          deviceInfo.screenWidth <= 1920 &&
          "screenHeight" in deviceInfo &&
          typeof deviceInfo.screenHeight === "number" &&
          deviceInfo.screenHeight <= 1080
        ) {
          return {
            width: 1920,
            height: 1080,
          };
        }
      }
    }
  } catch (err) {
    log.error(
      "Compat: Error when trying to call vendor API",
      err instanceof Error ? err : new Error("Unknown Error"),
    );
  }
  return {
    height: undefined,
    width: undefined,
  };
}
