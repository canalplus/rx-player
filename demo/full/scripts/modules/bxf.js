// Bytes utils
import BXFParser from "../../bxf-parser2/src/parser/index.js";

function be4toi(bytes, offset) {
  return (
    (bytes[offset + 0] * 0x1000000) +
    (bytes[offset + 1] * 0x0010000) +
    (bytes[offset + 2] * 0x0000100) +
    (bytes[offset + 3]));
}

function bytesToStr(bytes) {
  return String.fromCharCode.apply(null, bytes);
}

function strToBytes(str) {
  const len = str.length;
  const arr = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    arr[i] = str.charCodeAt(i) & 0xFF;
  }
  return arr;
}

function bytesToHex(bytes, sep) {
  let hex = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    hex += (bytes[i] >>> 4).toString(16);
    hex += (bytes[i] & 0xF).toString(16);
    if (sep.length && i < bytes.byteLength - 1) {
      hex += sep;
    }
  }
  return hex;
}

// HAPI Calls

function getContentPlayset(token, affaire, pgrm) {
  return new Promise((resolve, reject) => {
    const HAPIUrl = "https://secure-gen-hapi.canal-plus.com/conso/playset?contentId=ANT_" + affaire + "_" + pgrm;
    const xhr = new XMLHttpRequest();
    xhr.open("GET", HAPIUrl, true);
    xhr.setRequestHeader("authorization", "PASS Token=\""+token+"\"");
    xhr.setRequestHeader("xx-operator","pc");
    xhr.setRequestHeader("xx-service","mycanal");
    xhr.setRequestHeader("xx-follow-links","playsets,contents");
    xhr.setRequestHeader("xx-suboffers","CP_ALD");
    xhr.setRequestHeader("xx-domain", "json");
    xhr.setRequestHeader("xx-profile-id","0");
    xhr.onload = (evt) => {
      const result = JSON.parse(evt.target.response);
      if (result.available){
        const widevinePlayset = result.available.reduce((acc, val) => {
          if(val.drmType === "DRM Widevine"){
            return val;
          }
          return acc;
        }, undefined);
        resolve(widevinePlayset);
      }
      reject();
    };
    xhr.send();
  });
}

function getMediaInfosURL(token, widevinePlayset) {
  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    const VIEWUrl = "https://secure-gen-hapi.canal-plus.com/conso/view";
    xhr.open("PUT", VIEWUrl, true);
    xhr.setRequestHeader("xx-operator","pc");
    xhr.setRequestHeader("authorization", "PASS Token=\""+token+"\"");
    xhr.setRequestHeader("xx-service","mycanal");
    xhr.setRequestHeader("xx-follow-links","medias");
    xhr.setRequestHeader("xx-distmodes", "tvod,catchup,svod,postvod");
    xhr.setRequestHeader("xx-suboffers","CP_ALD");
    xhr.setRequestHeader("xx-domain", "json");
    xhr.setRequestHeader("xx-profile-id","0");
    xhr.setRequestHeader("xx-device","pc ebf5f9a1-9a02-461d-8723-abb962396981");
    xhr.setRequestHeader("Content-Type","application/json; charset=utf-8");
    xhr.onload = (evt) => {
      const result = JSON.parse(evt.target.response);
      const media = result["@medias"];
      resolve(media);
    };
    xhr.send(JSON.stringify(widevinePlayset));
  });
}

function getLicenseObject(token, licenseURL, challenge){
  if (licenseURL === fillingLicenseURL) {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", licenseURL, true);
    xhr.responseType = "application/octet-stream";
    return new Promise((resolve) => {
      xhr.onload = (evt) => {
        const license = evt.target.response;
        resolve(strToBytes(atob(license)));
      };
      xhr.send(btoa(bytesToStr(challenge)));
    });
  }

  const xhr = new XMLHttpRequest();
  xhr.open("POST", licenseURL, true);
  xhr.setRequestHeader("xx-operator","pc");
  xhr.setRequestHeader("xx-service","mycanal");
  xhr.setRequestHeader("xx-distmodes", "tvod,catchup,svod,postvod");
  xhr.setRequestHeader("xx-domain", "json");
  xhr.setRequestHeader("xx-profile-id","0");
  xhr.setRequestHeader("xx-device","pc ebf5f9a1-9a02-461d-8723-abb962396981");
  xhr.setRequestHeader("authorization", "PASS Token=\""+token+"\"");
  xhr.setRequestHeader("xx-api-version", "2");
  xhr.setRequestHeader("Content-type", "text/plain");
  const formatted = btoa(bytesToStr(challenge));
  return new Promise((resolve) => {
    xhr.onload = (evt) => {
      const xml = evt.target.response;
      const domParser = new DOMParser();
      const licenceXML = domParser.parseFromString(xml, "text/xml");
      const license = licenceXML.getElementsByTagName("license")[0];
      const result = atob(license.textContent);
      resolve(strToBytes(result));
    };
    xhr.send(formatted);
  });
}

function getManifestAndLicenseURL(token, mediaURL) {
  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    xhr.open("GET", mediaURL, true);
    xhr.setRequestHeader("xx-operator","pc");
    xhr.setRequestHeader("authorization", "PASS Token=\""+token+"\"");
    xhr.setRequestHeader("xx-service","mycanal");
    xhr.setRequestHeader("xx-follow-links","medias");
    xhr.setRequestHeader("xx-distmodes", "tvod,catchup,svod,live,postvod");
    xhr.setRequestHeader("xx-suboffers","CP_ALD");
    xhr.setRequestHeader("xx-domain", "json");
    xhr.setRequestHeader("xx-profile-id","0");
    xhr.setRequestHeader("xx-device","pc ebf5f9a1-9a02-461d-8723-abb962396981");
    xhr.setRequestHeader("Content-Type","application/json; charset=utf-8");
    xhr.onload = (evt) => {
      const media = JSON.parse(evt.target.response);
      const manifestURL = (
        media["VM"] ||
        media["VOST"] ||
        media["VF"] ||
        Object.values(media)[0]
      )[0].media[0].distribURL;
      const licenseURL = (
        media["VM"] ||
        media["VOST"] ||
        media["VF"] ||
        Object.values(media)[0]
      )[0]["@licence"];
      resolve({
        manifestURL,
        licenseURL,
      });
    };
    xhr.send();
  });
}

async function getManifestURL(token, affaire, pgrm) {
  const playset = await getContentPlayset(token, affaire, pgrm);
  const mediaInfoURL = await getMediaInfosURL(token, playset);
  const { manifestURL, licenseURL } =
    await getManifestAndLicenseURL(token, mediaInfoURL);
  return { manifestURL, licenseURL };
}

// BXFParsing

function parseBXF(url, parserURL, responseType) {
  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    xhr.open("GET",url,true);
    xhr.responseType = responseType;
    xhr.send();
    return new Promise((resolve) => {
      xhr.onload = (evt) => {
        resolve(evt.target.response);
      };
    }).then((bxfString) => {
      return resolve(parserURL(bxfString));
      // const xhr = new XMLHttpRequest();
      // xhr.open("POST", parserURL, true);
      // xhr.responseType = "json";
      // xhr.onload = (evt) => {
      //   const parsedBXF = evt.target.response;
      //   resolve(parsedBXF);
      // };
      // xhr.send(bxfString);
    });
  });
}

// Getting Widevine KID from manifest

function b64Decode(str) {
  // Going backwards: from bytestream, to percent-encoding, to original string.
  return atob(str)
    .split("")
    .filter((_, i) => !(i % 2))
    .join("")
}

function guidToUuid(buf) {
  const p1A = buf[0];
  const p1B = buf[1];
  const p1C = buf[2];
  const p1D = buf[3];
  const p2A = buf[4];
  const p2B = buf[5];
  const p3A = buf[6];
  const p3B = buf[7];
  const p4 = buf.subarray(8, 10);
  const p5 = buf.subarray(10, 16);

  const ord = new Uint8Array(16);
  ord[0] = p1D; ord[1] = p1C; ord[2] = p1B; ord[3] = p1A; // swap32 BE -> LE
  ord[4] = p2B; ord[5] = p2A;                             // swap16 BE -> LE
  ord[6] = p3B; ord[7] = p3A;                             // swap16 BE -> LE
  ord.set(p4,  8);
  ord.set(p5, 10);

  return bytesToHex(ord, "-");
}

function getKID(url) {
  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    xhr.open("GET", url + "/Manifest", true);
    xhr.onload = (evt) => {
      const manifest = evt.target.response;
      const domParser = new DOMParser();
      const parsedManifest = domParser.parseFromString(manifest, "text/xml");
      const protection = parsedManifest.getElementsByTagName("Protection")[0];
      const base64PSSH = protection.firstElementChild.textContent;
      const PSSH = b64Decode(base64PSSH);
      // const PSSH = bytesToStr(PSSHbytes);
      const finalPSSH = PSSH.substring(PSSH.indexOf("<WRMHEADE"), Infinity);
      const playreadyPSSH = domParser.parseFromString(finalPSSH, "text/xml");
      const kid = playreadyPSSH.getElementsByTagName("KID")[0].textContent;
      const bytesKid = strToBytes(atob(kid));
      const hexaKid = guidToUuid(bytesKid).toUpperCase();
      resolve({
        kid: hexaKid,
      });
    };
    xhr.send();
  });
}

// Demo

/* Globals */
const kidByAffairePgrm = {};
// const token = window.passToken;
const token = "10501iObW9VdwlLPyTU1NGuydH2UNMmVjMuw6wD_sHZhPB3tcSg3FhHD0ukLdfjJ34aqzhKel1x1XXbmsv_tonybGZrptgPaert3HD6xF6tZiTwy7r0iwvEKvFuZsfyrz7m6ux32pYsjwiu7aNbZ1HiW-yMLMoaaLz2iGmt_O_0nwWLWMyhxQm_mqmwoUZGeglG84XoCyr3LgOVwHiU5LX9fVLzvZUEanicXxT_4PuCit7f0OyyS7dp9d4eiE6q0QquXx9U-Tu_OXxIMnM-24x4OvCL_1a2uZbWH3OhgvDGRpsPMpLpXyiMtk8TV7yoJsGlzoOXKQdBjV4ubNzFiHt3ffWVkegDpJEYaP-0_SIXnjq3OZmtYRG5FS6-Yc5vwqYmPg_HM3IeXhadSI1972rqmqk-qcr7VqYKurBN819prVeRhZ9xBu8AoYWPs_Tnp9zv4vR9HXI9RJERn8Gplfv8RuecA4aAF60F5Js2jtEQWlFEEJ_8qdDmNpJjACr2vUGCcCpscUT1KNEQcbTf5ZCtxjDFInLi_BQnQY0jDMKAEQocY8VQ3SExcM7Pbi1AG8Y-1hH0o9miWSZTAlr2dvU8v_Wsxi3HGr3ctkNdIxEsmNi3OgQ2IvZmq3eEQhXcgx2TPSPhxo4z5lSvEZD_sRUpCfHlJbpZjGo8yDdEfEUkROBL9sku_nqqgkqf8TR4tMDmT42Q3ehE8HQtd5ggAS4HDCCzBqWahrUhbBag8dN-brpmRIhGe1eSsNbHJ0x5KVZI3d4BcCJW5l1F-hTzbJTIFBL_yNRCteP3TUGnyyYFz5Lw7ONPd9SU9GF0xPJtNR7-OgHptW9gRXTKxMEA3uOQdZ6BN9HLNO4626wwzzbB4StC1IjyxhlUv17JlvVv7zA3TlCAYMCGz5XzBCQb_A8yKJtWT_SQaEUmYDStRXDqf3ZSsei0JX9s_G2otSmrf_Sl0rZtQbgR8gUxs9Fmu0zrNqYaP8S718BNf2sK6WdolWYaF5etytS1p4l9K8uuCtTkN6ET28Vn8ToThs19LhpiorerS9bHUYN5Cq7F13DbdftyRDwNB9uKNREfamqCT7WzwHUJlgympHJJXt1ucJo_61i7qRvaYYDwir3-9BgJEIWq8T0G8GLAxJoiEEWIjB0rMSoFxJ-f8RG63mV2xFARAVCW3i5Dqlmyo-APeVDtE_QErnXILW8Zz0cxSEf9dErOm2Ed5n4HKyv9_A_ny3trtGS7njOSGUskj9tAbZnTEJAFo_4knWwfy3lsmCyaGhiVGsQ61D2D1cXt61Ip6vADpulg4ugeQ-1C8OO3kcaKLUImBcYuSWrktJwUrADv_kyBNBX-7MJDZqKoExCC8pjo2eSrnw-H1M1_rw-86RulCwK1OOpAAFHNdVPKxbnamp3r3lA4HYCh1qDjQsnNUiotD_V_qAa3i4K-zCmWxEvrQ0qXS1CuxX9HdR2DEvKIzUqy26VZMPdnCXUHvqzAWdJTuM4u5N5YyNr8T08lpAh-5a9MgpEsto3jUuyKIOnxRz5BFFnpsbhXlFEye1_JY88KMFQjtJ4L5jiYNkzoKeu2a67bko_D7qR1azYo_xnWmAkdc7-TMZMDVa2Jim-tJF2SFAWM_lspOupm-KcJWfoaQYxiB57kAfOxuvEg_f0_PVHvdtfoeNoEX0hT-Qk25K5-k0VMtmvNfOnMJ8kF8YaooLiy9NtIiWG9KjTHFkej8wzSlq";
const fillingManifestURL = "http://hss-vod-aka-test.canal-bis.com/ondemand/rx-test/03/index.ism/manifest";
const fillingLicenseURL = "https://secure-webtv.canal-bis.com/WebPortal-vabf/TestDRM/api/Playready";
const fillingTransportType = "smooth";
const fillingDuration = 600;
const pictos = {
  "Déconseillé -10ans": "http://drm.canal-plus.com:8000/bxf-parser2/tmp/picto10.png",
  "Déconseillé -12ans": "http://drm.canal-plus.com:8000/bxf-parser2/tmp/picto12.png",
  "Déconseillé -16ans": "http://drm.canal-plus.com:8000/bxf-parser2/tmp/picto16.png",
  "Déconseillé -18ans": "http://drm.canal-plus.com:8000/bxf-parser2/tmp/picto18.png",
};
const channelLogoURL = "http://drm.canal-plus.com:8000/bxf-parser2/tmp/series.png";
const timeShiftBufferDepth = 60 * 60 * 8;

function getURLForPicto(title) {
  return pictos[title];
}

function getLicenseURL(initData) {
  const keyid = parseInitData(initData).toUpperCase();
  if (!keyid) {
    throw "ERROR";
  }
  return kidByAffairePgrm[keyid];
}

function getLicense(challenge, _, initData) {
  const licenseURL = getLicenseURL(initData);
  return new Promise((resolve) => {
    getLicenseObject(token, licenseURL, challenge).then((license) => {
      resolve(license);
    });
  });
}

function getServerCertifcate() {
  const xhr = new XMLHttpRequest();
  xhr.open("GET", "https://secure-webtv-static.canal-plus.com/widevine/cert/cert_license_widevine_com.bin", true);
  xhr.responseType = "arraybuffer";
  return new Promise((resolve) => {
    xhr.onload = (evt) => {
      resolve(evt.target.response);
    };
    xhr.send();
  });
}

function parseInitData(initData) {
  function getAllIndexes(arr, val) {
    const indexes = [];
    let i = -1;
    while ((i = arr.indexOf(val, i+1)) != -1) {
      indexes.push(i);
    }
    return indexes;
  }
  const idx = getAllIndexes(bytesToStr(initData), "pssh");
  const psshs = idx.reduce((acc, value) => {
    const begin = value - 4;
    let position = begin;
    position += 8;
    const version = be4toi(initData, position);
    position += 4;
    if (version === 0) {
      position += 16;
      const privateLength = be4toi(initData, position);
      position += 4;
      const privateData = initData.subarray(position, position + privateLength);
      acc.push(privateData);
    }
    return acc;
  }, []);
  const widevinePssh = psshs.find((pssh) => pssh.length === 20);
  if (widevinePssh) {
    return bytesToHex(widevinePssh.subarray(4, 20), "-");
  }
  return undefined;
}

export default function loadBXF({
  url: bxfURL,
  textTrackElement,
  overlayElement,
  textTrackMode,
  networkConfig,
  manualBitrateSwitchingMode,
  beginning,
}) {
  return parseBXF(bxfURL, BXFParser, "text").then(async ({ contents: parsedContents }) => {
    /* eslint-disable no-console */
    console.log("############## Parsed BXF ################");
    /* eslint-enable no-console */

    getKID(fillingManifestURL).then(({ kid }) => {
      kidByAffairePgrm[kid] = fillingLicenseURL;
    });

    const epg = [];
    const contents = [];
    const overlays = [];
    const logoOverlays = [];

    const promises = [];

    for (const parsedContent of parsedContents) {
      promises.push(
        new Promise((resolve, reject) => {
          const videos = parsedContent.video;
          if (videos) {
            for(const video of videos) {
              getManifestURL(token, video.affaire, video.pgrm)
                .then(({ manifestURL, licenseURL }) => {
                  epg.push({
                    startTime: video.startTime,
                    endTime: video.endTime,
                    title: video.title,
                    isAvailable: true,
                  });
                  const subtitleURL = manifestURL.indexOf(".ism") > 0 ? manifestURL.substring(0, manifestURL.indexOf(".ism")) + ".vtt" : undefined;
                  const textTracks = [];

                  if (subtitleURL) {
                    const xhr = new XMLHttpRequest();
                    xhr.open("GET", subtitleURL, false);
                    xhr.send();
                    if (xhr.status < 300) {
                      textTracks.push({
                        url: subtitleURL,
                        language: "FRA",
                        mimeType: "text/vtt",
                      });
                    }
                  }

                  const completeManifestURL = manifestURL + "/manifest";
                  const xhr = new XMLHttpRequest();
                  xhr.open("GET", completeManifestURL, true);
                  xhr.responseType = "text";
                  xhr.onload = (evt) => {
                    const manifestString = evt.target.response;
                    const domParser = new DOMParser();
                    const manifest = domParser.parseFromString(manifestString, "text/xml");
                    const duration = parseInt(manifest.childNodes[0].getAttribute("Duration"), 10);
                    const timescale = 10000000;
                    const scaledDuration = duration / timescale;

                    /* eslint-disable no-console */
                    console.log("DIFF", video.title, scaledDuration, video.endTime - video.startTime);
                    /* eslint-enable no-console */

                    contents.push({
                      name: video.title,
                      url: completeManifestURL,
                      startTime: video.startTime,
                      endTime: Math.min(
                        video.endTime,
                        video.startTime + scaledDuration
                      ),
                      transport: "smooth",
                      textTracks,
                    });

                    const logos = parsedContent.logo;
                    if (logos) {
                      logos.forEach((logo) => {
                        const { title, offset } = logo;
                        const url = getURLForPicto(title);
                        if (url) {
                          const { begin, end } = offset;
                          const overlay = {
                            start : video.startTime + (begin || 0),
                            end : video.endTime - (end || 0),
                            timescale : 1,
                            version : 1,
                            elements : [{
                              url,
                              format : "png",
                              xAxis : "0%",
                              yAxis : "0%",
                              height : "100%",
                              width : "100%",
                            }],
                          };
                          const logoStart = video.startTime;
                          const logoEnd = logoStart + 10;
                          overlay.start = logoEnd;
                          const overlayData = JSON.parse(
                            JSON.stringify(overlay)
                          );
                          overlayData.elements.push({
                            url: channelLogoURL,
                            format: "png",
                            xAxis: "85%",
                            yAxis: "10%",
                            height: "10%",
                            width: "12%",
                          });
                          overlayData.start = logoStart;
                          overlayData.end = logoEnd;
                          logoOverlays.push(overlayData);
                          overlays.push(overlay);
                        }
                      });
                    } else {
                      logoOverlays.push({
                        start: video.startTime,
                        end: video.startTime + 20,
                        timescale: 1,
                        version: 1,
                        elements: [
                          {
                            url: channelLogoURL,
                            format: "png",
                            xAxis: "85%",
                            yAxis: "10%",
                            height: "10%",
                            width: "12%",
                          },
                        ],
                      });
                    }
                    getKID(manifestURL).then(({ kid }) => {
                      kidByAffairePgrm[kid] = licenseURL;
                      resolve();
                    }).catch((error) => {
                      reject(error);
                    });
                  };
                  xhr.send();

                }).catch(() => {
                  epg.push({
                    startTime: video.startTime,
                    endTime: video.endTime,
                    title: video.title,
                    isAvailable: false,
                  });
                  resolve();
                });
            }
          } else {
            resolve();
          }
        })
      );
    }

    return Promise.all(promises).then(() => {
      const finalOverlays = overlays.concat(logoOverlays);

      /* eslint-disable no-console */
      console.log("############## Built Metaplaylist ################");
      /* eslint-enable no-console */

      const contentsWithBlack = [];

      contents.sort((A, B) => A.startTime - B.startTime);

      contents.forEach((content, i) => {
        if (i === 0) {
          contentsWithBlack.push(content);
        } else {
          if (content.startTime >= contents[i - 1].endTime) {
            const contentStartTime = contents[i - 1].endTime;
            const contentEndTime = content.startTime;
            let startTime = contentStartTime;
            let endTime = Math.min(startTime + fillingDuration, contentEndTime);
            let diff = contentEndTime - contentStartTime;
            do {
              contentsWithBlack.push({
                url: fillingManifestURL,
                endTime,
                startTime,
                transport: fillingTransportType,
              });
              diff -= fillingDuration;
              startTime = endTime;
              endTime = Math.min(startTime + fillingDuration, contentEndTime);
            } while (diff > 0);
            contentsWithBlack.push(content);
          }
        }
      });

      // Content Before

      const contentBefore = [];
      {
        if (contentsWithBlack.length) {
          const beforeUntilTime = contentsWithBlack[0].startTime;
          const beforeFromTime = beforeUntilTime - timeShiftBufferDepth;

          let startTime = beforeFromTime;
          let endTime = Math.min(startTime + fillingDuration, beforeUntilTime);

          let diff = beforeUntilTime - beforeFromTime;
          do {
            contentBefore.push({
              url: fillingManifestURL,
              endTime,
              startTime,
              transport: fillingTransportType,
            });
            diff -= fillingDuration;
            startTime = endTime;
            endTime = Math.min(startTime + fillingDuration, beforeUntilTime);
          } while (diff > 0);
        }
      }

      // Content After

      const contentAfter = [];
      {
        if (contentsWithBlack.length) {
          const afterFromTime = contentsWithBlack[contentsWithBlack.length -1]
            .endTime;
          const afterUntilTime = afterFromTime + timeShiftBufferDepth;

          let startTime = afterFromTime;
          let endTime = Math.min(startTime + fillingDuration, afterUntilTime);
          let diff = afterUntilTime - afterFromTime;
          do {
            contentAfter.push({
              url: fillingManifestURL,
              endTime,
              startTime,
              transport: fillingTransportType,
            });
            diff -= fillingDuration;
            startTime = endTime;
            endTime = Math.min(startTime + fillingDuration, afterUntilTime);
          } while (diff > 0);
        }
      }

      const finalContent = contentBefore
        .concat(contentsWithBlack.concat(contentAfter));

      let offset = 0;
      let startAt = Date.now();
      if (beginning != null) {
        offset = (Date.now() / 1000 - beginning) - 4 * 60 * 60;
        startAt = Date.now() / 1000;
      }

      finalContent.forEach((content) => {
        content.startTime += offset;
        content.endTime += offset;
      });

      epg.forEach((prog) => {
        prog.startTime += offset;
        prog.endTime += offset;
      });

      finalOverlays.forEach((overlay) => {
        overlay.start += offset;
        overlay.end += offset;
      });

      epg.sort((A, B) => A.startTime - B.startTime);
      finalContent.sort((A, B) => A.startTime - B.startTime);
      finalOverlays.sort((A, B) => A.start - B.start);

      const metaplaylist = {
        attributes: {
          version: "0.1",
          dynamic: true,
          overlays: finalOverlays,
        },
        contents: finalContent,
      };

      if (contents.length >= 1) {
        const str = JSON.stringify(metaplaylist);
        const blob = new Blob([str], { type: "application/json"});
        const manifestURL = URL.createObjectURL(blob);
        getServerCertifcate().then((certificate) => {
          /* eslint-disable no-console */
          console.log("############## Load video ################");
          /* eslint-enable no-console */

          window.player.loadVideo({
            url: manifestURL,
            transport: "metaplaylist",
            autoPlay: true,
            defaultAudioTrack: {
              language: "eng",
              audioDescription: false,
            },
            defaultTextTrack: {
              language: "fra",
              closedCaption: false,
            },
            textTrackElement,
            textTrackMode,
            overlayElement,
            networkConfig,
            manualBitrateSwitchingMode,
            keySystems: [
              {
                type: "playready",
                getLicense,
                serverCertificate: certificate,
              },
            ],
            startAt: {
              wallClockTime: startAt,
            },
          });
        });
      }
      return epg;
    });
  });
}
