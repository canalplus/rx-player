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
      const PSSHbytes = strToBytes(atob(base64PSSH));
      const PSSH = new TextDecoder("utf-16").decode(PSSHbytes);
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
const token = "10501iObW9VdwlLPyTU1NGuydH2UNMmVjMuw6wD_sHZhPB3tcSg3FhHD0ukLdfjJ34aqzjyydGuu_Rk8GTo41XVeBugwAOytTCSp4T4xsobJMfT_VOc6YmnvumO2bujneNM5dQgR_JyfsItdQdLWuWgFVkR6TsvPqgNJSN20WQtq6wxG_PRsvYaT4F6hautlBpwXUm8nBYeRO3JYf-5G3OXk8-5tn1dDoj1p1cA0roBiRZClYgkt5vDhZy4bL2fBE4spgLyJx9KSaAfpMtLFwl0yDh4ccoZQqUSxxCYfUorNwGwx5SS5kgKBKITl_Dnn9S4IJz68OeGXHBggzHDSpn5pSQWoPT5XRlZEiFF0i71ecDP-7jXnktcBvygAjwxdHHhM22br6XmRjJBZSdZHoDXBJY1udsMUTswfQdC69zD73Y58Vs2htrEe-1xRWRfGU76wT7KC6MnFTO8XwmTpCbVwyKG47u6ZnQETSMgW0P1okZL_h7yVhJJmeA56B3xCRrB36C52-3SlHKy0Hnlb10rkuUxHdaauLaAT9A4Okml9KWR45XDMeTBGqnzs28H9W1x38yoxrm-ti__oLs4Fl5sB9Pf6jqcyM0gbQEqInbSo8APjklpgCB83V8FgIk-z8yCFj-kcVwbbLiQYibWuqKtUtbckvtQKzZCnDqvf98CqOeYrC38JTw_QtqJTwGAouCxgDzy7T7B6W6jE41NRFI87WHIh9YPivEQCZw4GKYBKXmCegE42mnCxv399RqpQRnKiuMY7eUuSZSx08x3PbOBhGBZ5zS2-PNpg4zumG69N0UIfWvoTFwPvWl32DMr018SamkW-tPp4wtIBT8aE9VD3DHCf_XJezppXZht48xMNyZ6fAtSao39HTWLa9nAIInedSL0_UhkUMI_CNHVKCE_1mOPehKkWPiLwhK1CK0I6itUxWsNAusVIwJm0LqgM-mGHCxqXf8uge45zwZcOTUXbPfYw8Q2mbK--YEael0vZUnmLN3W9OcZV9PqGJMbhm1Im83fMwmO2grYDGlXRbqmCEQGBYd_Rqz5tsRBGOfyNHTpc_ZLB-r1URQZvtXuqR_OLO0l1d3jssDNqO57Nh99dfrkdGmlJp1R9vEe7r-uSKoJzM_QT4DuJDdlyho9iz85MTu1FodnzIbWPct59d0-G-UhgakBDrUbZ9_AF_i6zJIKespEu4iKtHT0nUBUCbFGmND1WEvuI_aZ41z8mJgKYtiByj4kGoMeAF-vByhyfPQe3wrcMkuCfROPnA1Xj0KrfkiaIhkHyPwlaHjyTy6uxo3yHKz14PAtpz864aRa5So5GryvlAE0TwVd6fH2I8ChlNONgkiy7U3K5DePjGpaqD-mwjOKOqL0ske4vyvP9YNWxBbm4xIAMujT1Pq3I2_-UWtgOqaknH9OvE2BsmL_G7uQJUxMjvMnhb3Y2o2Rwn0NwqJgKFWPGIRlU7YjEuj3OT3QgN02tj9Rikk2VXuchHb6xZbwoKVGOS7aKwVRugbZo4nckNwZ9NTcoenAyaG28FyMlYkeQAf8XFn4OQfkHRIpaHn08k44esQ9Bu4byj1JIxg4YZfMKFX24nzMBm1dEO92BQDC87IH2I5XuYNVWC02Vm34xnAf8s7qJDUzqoBHF4GPN7CMSPTd9gkdY4vyyhZP0Kvkh_SUO-TuUkrWcmQV8sNyhl75xfqkeWHni_oevA2vlyPhOnQWCegkFvTyj14y-nQztxPnmcD7AwdbPNhPFmWO_8flwwC_RtVmhJyWp-rWS1jqQz1DLbpF-ixJafHaaM_onjKhdvF3R-IHFBpwdyCL2qkkIlJlMcjkDbVn-cdSCaUEsj1fulw5B3wjrR";
const fillingManifestURL = "http://hss-vod-aka-test.canal-bis.com/ondemand/rx-test/03/index.ism/manifest";
const fillingLicenseURL = "https://secure-webtv.canal-bis.com/WebPortal-vabf/TestDRM/api/Widevine";
const fillingTransportType = "smooth";
const fillingDuration = 600;
const pictos = {
  "Interdit en salle -10": "https://developers.canal-plus.com/rx-player/canaltech/bxf-parser2/tmp/picto10.png",
  "Déconseillé -10ans": "https://developers.canal-plus.com/rx-player/canaltech/bxf-parser2/tmp/picto10.png",
  "Interdit en salle -12": "https://developers.canal-plus.com/rx-player/canaltech/bxf-parser2/tmp/picto12.png",
  "Déconseillé -12ans": "https://developers.canal-plus.com/rx-player/canaltech/bxf-parser2/tmp/picto12.png",
  "Interdit en salle -16": "https://developers.canal-plus.com/rx-player/canaltech/bxf-parser2/tmp/picto16.png",
  "Déconseillé -16ans": "https://developers.canal-plus.com/rx-player/canaltech/bxf-parser2/tmp/picto16.png",
  "Interdit en salle -18": "https://developers.canal-plus.com/rx-player/canaltech/bxf-parser2/tmp/picto18.png",
  "Déconseillé -18ans": "https://developers.canal-plus.com/rx-player/canaltech/bxf-parser2/tmp/picto18.png",
};
const channelLogoURL = "https://developers.canal-plus.com/rx-player/canaltech/bxf-parser2/tmp/series.png";
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
  const textDecoder = new TextDecoder("utf-8");
  function getAllIndexes(arr, val) {
    const indexes = [];
    let i = -1;
    while ((i = arr.indexOf(val, i+1)) != -1) {
      indexes.push(i);
    }
    return indexes;
  }
  const idx = getAllIndexes(textDecoder.decode(initData), "pssh");
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
                    const duration = parseInt(manifest.firstElementChild.getAttribute("Duration"));
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

                    // if (video.title === "Traque à Boston") {
                    //   debugger;
                    // }
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
        const contentBefore = contents[i - 1];
        if (contentBefore && content.startTime > contentBefore.endTime) {
          let blackStartTime = contentBefore.endTime;
          const blackEndTime = content.startTime;
          do {
            const black = {
              url: fillingManifestURL,
              startTime: blackStartTime,
              endTime: Math.min(blackStartTime + fillingDuration, blackEndTime),
              transport: fillingTransportType,
            };
            contentsWithBlack.push(black);
            blackStartTime += fillingDuration;
          } while (blackStartTime < blackEndTime);
        }
        contentsWithBlack.push(content);
      });

      // Content Before

      const contentBefore = [];
      if (contentsWithBlack.length) {
        const beforeToTime = contentsWithBlack[0].startTime;
        let beforeFromTime = beforeToTime - timeShiftBufferDepth;
        if (beforeToTime > beforeFromTime) {
          do {
            const black = {
              url: fillingManifestURL,
              startTime: beforeFromTime,
              endTime: Math.min(beforeFromTime + fillingDuration, beforeToTime),
              transport: fillingTransportType,
            };
            contentBefore.push(black);
            beforeFromTime += fillingDuration;
          }
          while (beforeFromTime < beforeToTime);
        }
      }

      // Content After

      const contentAfter = [];
      if (contentsWithBlack.length) {
        let afterFromTime = contentsWithBlack[contentsWithBlack.length - 1].endTime;
        const afterToTime = afterFromTime + timeShiftBufferDepth;
        do {
          const black = {
            url: fillingManifestURL,
            startTime: afterFromTime,
            endTime: Math.min(afterFromTime + fillingDuration, afterToTime),
            transport: fillingTransportType,
          };
          contentAfter.push(black);
          afterFromTime += fillingDuration;
        } while (afterFromTime < afterToTime);
      }

      const finalContent = contentBefore
        .concat(contentsWithBlack.concat(contentAfter));

      let offset = 0;
      let startAt = Date.now() / 1000;
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
                type: "widevine",
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
