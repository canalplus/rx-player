import type { IKeySystemOption } from "../../../src/public_types";
import { utf8ToStr, strToUtf8, leUtf16ToStr } from "./bytes";

export default async function parseDRMConfigurations(
  drmConfigurations: Array<{
    drm: string;
    fallbackKeyError: boolean;
    fallbackLicenseRequest: boolean;
    licenseServerUrl: string;
    serverCertificateUrl: string | undefined;
  }>,
): Promise<IKeySystemOption[]> {
  const keySystems = await Promise.all(
    drmConfigurations.map((drmConfig) => {
      const {
        drm,
        fallbackKeyError,
        fallbackLicenseRequest,
        licenseServerUrl,
        serverCertificateUrl,
      } = drmConfig;

      if (!licenseServerUrl) {
        return;
      }

      const type = drm.toLowerCase();
      const keySystem: IKeySystemOption = {
        type,
        getLicense: generateGetLicense(licenseServerUrl, type, !!fallbackLicenseRequest),
        onKeyInternalError: fallbackKeyError ? "fallback" : "error",
        onKeyOutputRestricted: fallbackKeyError ? "fallback" : "error",
      };

      if (!serverCertificateUrl) {
        return keySystem;
      }

      return getServerCertificate(serverCertificateUrl).then((serverCertificate) => {
        keySystem.serverCertificate = serverCertificate;
        return keySystem;
      });
    }),
  );
  return keySystems.filter((ks): ks is IKeySystemOption => ks !== undefined);
}

export function toDummyDrmConfiguration(
  baseOptions: IKeySystemOption[],
): IKeySystemOption[] {
  return baseOptions.map((ks) => {
    return {
      ...ks,
      getLicense(...args: Parameters<IKeySystemOption["getLicense"]>) {
        try {
          const challenge = args[0];
          const challengeStr = utf8ToStr(challenge);
          const challengeObj = JSON.parse(challengeStr) as {
            certificate: string | null;
            persistent: boolean;
            keyIds: string[];
          };
          const keys: Record<
            string,
            {
              policyLevel: number;
            }
          > = {};
          challengeObj.keyIds.forEach((kid) => {
            keys[kid] = {
              policyLevel: 50,
            };
          });
          const license = {
            type: "license",
            persistent: false,
            keys,
          };
          const licenseU8 = strToUtf8(JSON.stringify(license));
          return licenseU8.buffer;
        } catch (e) {
          return ks.getLicense(...args);
        }
      },
    };
  });
}

function getServerCertificate(url: string): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("GET", url, true);
    xhr.responseType = "arraybuffer";
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const serverCertificate = xhr.response as ArrayBuffer;
        resolve(serverCertificate);
      } else {
        reject(new Error("Could not fetch serverCertificate: HTTP Status Error"));
      }
    };
    xhr.onerror = () => {
      reject(new Error("Could not fetch serverCertificate: Request Error"));
    };
    xhr.send();
  });
}

function formatPlayreadyChallenge(challenge: BufferSource): string {
  let u8Challenge;
  if (!(challenge instanceof Uint8Array)) {
    if (challenge instanceof ArrayBuffer) {
      u8Challenge = new Uint8Array(challenge);
    } else {
      u8Challenge = new Uint8Array(challenge.buffer);
    }
  } else {
    u8Challenge = challenge;
  }
  const str = leUtf16ToStr(u8Challenge);
  const match = /<Challenge encoding="base64encoded">(.*)<\/Challenge>/.exec(str);
  const xml = match ? atob(match[1]) /* IE11 / EDGE */ : utf8ToStr(u8Challenge); // Chromecast
  return xml;
}

function generateGetLicense(
  licenseServerUrl: string,
  drmType: string,
  fallbackOnLastTry: boolean | undefined,
): (rawChallenge: BufferSource) => Promise<BufferSource | null> {
  const isPlayready = drmType.indexOf("playready") !== -1;
  return (rawChallenge: BufferSource): Promise<BufferSource | null> => {
    const challenge = isPlayready ? formatPlayreadyChallenge(rawChallenge) : rawChallenge;
    const xhr = new XMLHttpRequest();
    xhr.open("POST", licenseServerUrl, true);
    return new Promise<BufferSource | null>((resolve, reject) => {
      xhr.onerror = () => {
        const error = new Error("getLicense's request failed on an error");
        (error as unknown as Record<string, unknown>).fallbackOnLastTry =
          fallbackOnLastTry;
        reject(error);
      };
      xhr.onload = (evt) => {
        if (xhr.status >= 200 && xhr.status < 300) {
          if (evt.target === null) {
            resolve(null);
            return;
          }
          const license = xhr.response as ArrayBuffer;
          resolve(license);
        } else {
          const error = new Error(
            "getLicense's request finished with a " + `${xhr.status} HTTP error`,
          );
          (error as unknown as Record<string, unknown>).noRetry = fallbackOnLastTry;
          (error as unknown as Record<string, unknown>).fallbackOnLastTry =
            fallbackOnLastTry;
          reject(error);
        }
      };
      if (isPlayready) {
        xhr.setRequestHeader("content-type", "text/xml; charset=utf-8");
      } else {
        xhr.responseType = "arraybuffer";
      }
      xhr.send(challenge);
    }).then((license) =>
      isPlayready && typeof license === "string" ? strToUtf8(license) : license,
    );
  };
}
