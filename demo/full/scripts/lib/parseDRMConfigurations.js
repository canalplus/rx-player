import {
  bytesToStr,
  strToBytes,
  bytesToUTF16Str,
} from "./bytes.js";

export default function parseDRMConfigurations(
  drmConfigurations,
  { fallbackKeyError, fallbackLicenseRequest }
) {
  return Promise.all(drmConfigurations.map(drmConfig => {
    const { licenseServerUrl,
            serverCertificateUrl,
            drm } = drmConfig;

    if (!licenseServerUrl) {
      return ;
    }

    const type = drm.toLowerCase();
    const keySystem = {
      type,
      getLicense: generateGetLicense(licenseServerUrl,
                                     type,
                                     !!fallbackLicenseRequest),
      fallbackOn: {
        keyInternalError: !!fallbackKeyError,
        keyOutputRestricted: !!fallbackKeyError,
      },
    };

    if (!serverCertificateUrl) {
      return keySystem;
    }

    return getServerCertificate(serverCertificateUrl)
      .then((serverCertificate) => {
        keySystem.serverCertificate = serverCertificate;
        return keySystem;
      });
  })).then(keySystems => {
    return keySystems.filter(ks => ks);
  });
}

function getServerCertificate(url) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("GET", url, true);
    xhr.responseType = "arraybuffer";
    xhr.onload = (evt) => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const serverCertificate = evt.target.response;
        resolve(serverCertificate);
      } else {
        reject();
      }
    };
    xhr.onerror = (err) => {
      reject(err);
    };
    xhr.send();
  });
}

function formatPlayreadyChallenge(challenge) {
  const str = bytesToUTF16Str(challenge);
  const match = /<Challenge encoding="base64encoded">(.*)<\/Challenge>/.exec(str);
  const xml = match ?
    atob(match[1]) : /* IE11 / EDGE */
    bytesToStr(new Uint8Array(challenge)); // Chromecast
  return xml;
}

function generateGetLicense(licenseServerUrl, drmType, fallbackOnLastTry) {
  const isPlayready = drmType.indexOf("playready") !== -1;
  return (rawChallenge) => {
    const challenge =  isPlayready ?
      formatPlayreadyChallenge(rawChallenge) : rawChallenge;
    const xhr = new XMLHttpRequest();
    xhr.open("POST", licenseServerUrl, true);
    return new Promise((resolve, reject) => {
      xhr.onerror = () => {
        const error = new Error("getLicense's request failed on an error");
        error.fallbackOnLastTry = fallbackOnLastTry;
        reject(error);
      };
      xhr.onload = (evt) => {
        if (xhr.status >= 200 && xhr.status < 300) {
          const license = evt.target.response;
          resolve(license);
        } else {
          const error = new Error("getLicense's request finished with a " +
                                  `${xhr.status} HTTP error`);
          error.noRetry = fallbackOnLastTry;
          error.fallbackOnLastTry = fallbackOnLastTry;
          reject(error);
        }
      };
      if (isPlayready) {
        xhr.setRequestHeader("content-type", "text/xml; charset=utf-8");
      } else {
        xhr.responseType = "arraybuffer";
      }
      xhr.send(challenge);
    }).then(license =>
      isPlayready && typeof license === "string" ? strToBytes(license) : license
    );
  };
}
