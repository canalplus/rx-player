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
    return new Promise<BufferSource | null>((resolve, reject) => {
      if (drmType.indexOf("clearkey") >= 0) {
        try {
          const decodedChallenge = JSON.parse(
            utf8ToStr(bufferSourceToUint8Array(rawChallenge)),
          );
          const kids = decodedChallenge.kids;
          if (!Array.isArray(kids) || kids.length === 0) {
            throw new Error("Unknown key id");
          }
          // Consider the first kid. I'm not sure multiple-kids for a single
          // init data is ever encountered in our case / in the wild?
          const kid = kids[0];
          let key;
          switch (kid) {
            // Some hardcoded kid defined somewhere by Canal+
            case "ASNFZ4mrze8BI0VniavN7w":
              // The corresponding decryption key
              key = "_ty6mHZUMhD-3LqYdlQyEA";
              break;
            default:
              throw new Error("Unknown key id");
          }
          const license = {
            keys: [
              {
                kty: "oct",
                kid,
                k: key,
              },
            ],
          };
          resolve(strToUtf8(JSON.stringify(license)));
        } catch (err) {
          reject(err);
        }
        return;
      }
      const challenge = isPlayready
        ? formatPlayreadyChallenge(rawChallenge)
        : rawChallenge;
      const xhr = new XMLHttpRequest();
      xhr.open("POST", licenseServerUrl, true);
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

function bufferSourceToUint8Array(bufferSource: BufferSource) {
  if (bufferSource instanceof ArrayBuffer) {
    return new Uint8Array(bufferSource);
  }
  if (ArrayBuffer.isView(bufferSource)) {
    if (bufferSource.constructor === Uint8Array) {
      return bufferSource;
    }
    return new Uint8Array(bufferSource.buffer);
  }
  throw new TypeError("Input is not a valid BufferSource");
}
