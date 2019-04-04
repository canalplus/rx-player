// Bytes utils

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
    }
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
    }
    xhr.send(JSON.stringify(widevinePlayset));
  });
}

function getLicenseObject(token, licenseURL, challenge){
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
  return new Promise((resolve, reject) => {
    xhr.onload = (evt) => {
      const xml = evt.target.response;
      const domParser = new DOMParser();
      const licenceXML = domParser.parseFromString(xml, "text/xml");
      const license = licenceXML.getElementsByTagName("license")[0];
      const result = atob(license.textContent);
      resolve(strToBytes(result));
    }
    xhr.send(formatted);
  })
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
      const manifestURL = (media["VM"] || media["VF"])[0].media[0].distribURL;
      const licenseURL = (media["VM"] || media["VF"])[0]["@licence"];
      resolve({
        manifestURL,
        licenseURL
      });
    }
    xhr.send();
  });
}

async function getManifestURL(token, affaire, pgrm) {
  const playset = await getContentPlayset(token, affaire, pgrm);
  const mediaInfoURL = await getMediaInfosURL(token, playset);
  const { manifestURL, licenseURL } = await getManifestAndLicenseURL(token, mediaInfoURL);
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
      }
    }).then((bxfString) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", parserURL, true);
      xhr.responseType = "json";
      xhr.onload = (evt) => {
        const parsedBXF = evt.target.response;
        resolve(parsedBXF);
      };
      xhr.send(bxfString);
    })
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
    }
    xhr.send();
  });
}

// Demo

/* Globals */
const kidByAffairePgrm = {};
const token = "10501iObW9VdwlLPyTU1NGuydH2UNMmVjMuw6wD_sHZhPB3tcSg3FhHD0ukLdfjJ34aqzhKel1x1XXbmsv_tonybGZrptgPaert3HD6xF6tZiTwy7r0iwvEKvFuZsfyrz7m6ux32pYsjwiu7aNbZ1HiW-yMLMoaaLz2iGmt_O_0nwWLWMyhxQm_mqmwoUZGeglG84XoCyr3LgOVwHiU5LX9fVL1_hPptxfd_n6BGwAno8pB_u0aPjfp1XhEP2XOcEsA5nmH94azV-BPgSXwlFVU_-viNxijmpdUgs62qGLz4vKfluMTVzkdhMuhcSFsWGeCWfrZRDT4cvvxEGxX5E5P1i87P-Dc7FrM2D73Fs--6rc2re2f54_EddZ4CDI-7xiBW2ram14CQRjQsCYipAa1ESh63V-DSpoSGpUEDFa9oBxCAiV-_R5aCf9FeloUT60rb33CHdmRE_WlGW7bPgalEjw8fXIwr3pndmd3MMw2-YcTdM2YlAhK9UcT2t8a-0yQOniMiiom9gjjhYy9D11tqVa8h7JMMEqgCnMNp9RDzFZw6e8yxeuY1YN7CSTypK7j2-mT5l41XnYqqzEPiGzuRMSTEw_CLmbgmeEguAjmBQucWwX0l86tgFeapYWZLybjmLO1V9z1w4CUfBW8KBcl81SXDK6gi067O319gjr_bj_VV1VBrgwG5uQT1jn9AgTJU2Uo_Xvxv7ex5VHD_fKbifYsNaSHWhsPIwqYe9l5rcR5IaHwpBnEBPYOjgQAOCRiI0d0P8eUuy1TI0GIOBImlT7vcaWzyJWUXMQWiSoQOdy4HPXceV-ohSLPYFqKFAMaB7qlTrXsbEzvcwgVgUyyqs5gt8yT_LXBwNr19aTfmzBcK0_Ix_M3DxR9mT5s93cVNOvk4lRHWnhqeXUvrTbCBjTAFSqK1ZlDepLSRdlPBWv-1tFCQPLJvaK1w_33nJ9pJ2M_bOiHW-lMooyfxzjdIvve1i2m_oUplykmYtjt7jAHucFStw8WrfCADjpzGzNe50_eUfjUXajfA0iy5AmRYDTR4sGDNFmrzdU7DVFxn_Rin98qsOUucZ48tq0rrgYqnIkQssA0wipzKpGcjVlULzLiponvRuLqkSaWiFOaoLP5zjJdf6vBptFHOJfTUbPaC8wd93FWjF9Gol9PL8p59rIelnyRysiHg1h5BAwpSajy4S0rGE5O3ejwqVKjTbioPvDSApw8daGmnxuiXbulEPsGLSC5VfJd69EEmv7a1YLWMODhjr7unDqVmQGmo43U7_ow6cMyJKuac5D2BoHPwJ3xZc-uzKjW6ZvYHJV1igI5sigZwzc4b-rgGMTeFrCGMZNVliQG7bVOsD3WQX8N2DVkMd3oTLl2uCRB1zub_xvVpS_7clITfl7BDe0CMujIZq";
const BXFUrl = "http://127.0.0.1:8080/playlist_jeudi.xml";
const BXFParser = "http://127.0.0.1:3000/playlist";
const blackManifestURL = "http://127.0.0.1:8081/black.mpd";
const imageDictionnary = {
  "Déconseillé -10ans": "http://127.0.0.1:8082/picto10.png",
}

function getURLForLogoTitle(title) {
  return imageDictionnary[title];
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
    })
  });
}

function getServerCertifcate() {
  const xhr = new XMLHttpRequest();
  xhr.open("GET", "https://secure-webtv-static.canal-plus.com/widevine/cert/cert_license_widevine_com.bin", true);
  xhr.responseType = "arraybuffer";
  return new Promise((resolve) => {
    xhr.onload = (evt) => {
      resolve(evt.target.response);
    }
    xhr.send();
  })
}

function parseInitData(initData) {
  const textDecoder = new TextDecoder("utf-8");
  function getAllIndexes(arr, val) {
    var indexes = [], i = -1;
    while ((i = arr.indexOf(val, i+1)) != -1){
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

parseBXF(BXFUrl, BXFParser, "text").then(async ({ contents: parsedContents }) => {
  console.log("############## Parsed BXF ################");
  const contents = [];
  const overlays = [];
  debugger;
  for (const parsedContent of parsedContents) {
    const videos = parsedContent.video;
    if (videos) {
      for(const video of videos) {
        if (
          video.type === "CIN" ||
          video.type === "MUS" ||
          video.type === "CA" ||
          video.type === "SA" ||
          video.type === "EMI" ||
          video.type === "SER"
        ) {
          try {
            const { manifestURL, licenseURL } = await getManifestURL(token, video.affaire, video.pgrm);
            contents.push({
              name: video.title,
              url: manifestURL + "/Manifest",
              startTime: video.startTime,
              endTime: video.endTime,
              transport: "smooth",
            });
            const logos = parsedContent.logo;
            if (logos) {
              logos.forEach((logo) => {
                const { title, offset } = logo;
                const url = getURLForLogoTitle(title);
                if (url) {
                  const { begin, end } = offset;
                  overlays.push({
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
                  });
                }
              });
            }
            await getKID(manifestURL).then(({ kid }) => {
              kidByAffairePgrm[kid] = licenseURL;
            });
          } catch(_) {
          }
        }
      }
    }
  }

  console.log("############## Built Metaplaylist ################");

  const contentsWithBlack = [];

  contents.forEach((content, i) => {
    if (i === 0) {
      contentsWithBlack.push(content);
    } else {
      if (content.startTime > contents[i -1].endTime) {
        contentsWithBlack.push({
          url: blackManifestURL,
          endTime: content.startTime,
          startTime: contents[i -1].endTime,
          transport: "dash",
        });
        contentsWithBlack.push(content);
      }
    }
  });

  debugger; 

  const metaplaylist = {
    metadata: {
      name: "",
      mplVersion: "1.0",
      generatedAt: "",
    },
    contents: contentsWithBlack,
    attributes: {
      timeShiftBufferDepth: 10000
     },
    overlays: [],
  };

  if (contents.length >= 1) {
    const str = JSON.stringify(metaplaylist);
    const blob = new Blob([str], { type: "application/json"});
    const manifestURL = URL.createObjectURL(blob);
    getServerCertifcate().then((certificate) => {
      console.log("############## Load video ################");
      player.loadVideo({
        url: manifestURL,
        transport: "metaplaylist",
        autoPlay: true,
        keySystems: [
          {
            type: "widevine",
            getLicense,
            serverCertificate: certificate,
          }
        ]
      });
    });
  }
});
