const baseURL = "https://storage.googleapis.com/shaka-demo-assets/angel-one/";

function getByteRangedData(rangeHeader, dataAB) {
  const data = new Uint8Array(dataAB);
  if (!rangeHeader || !rangeHeader.startsWith("bytes=")) {
    return new Uint8Array(data).buffer;
  }

  const rangesStr = rangeHeader.substr(6).split("-");
  if (
    rangesStr[0] != "" && Number.isNaN(+rangesStr[0]) ||
    rangesStr[1] != "" && Number.isNaN(+rangesStr[1])
  ) {
    throw new Error("Invalid range request");
  }
  const rangesNb = rangesStr.map(x => x === "" ? null : +x);

  if (rangesNb[1] <= rangesNb[0]) {
    return new Uint8Array([]).buffer;
  }
  if (rangesNb[0] == null || rangesNb === 0) {
    if (rangesNb[1] == null) {
      return new Uint8Array(data).buffer;
    }
    return new Uint8Array(data.subarray(0, rangesNb[1] + 1)).buffer;
  }

  if (rangesNb[1] == null) {
    return new Uint8Array(data.subarray(rangesNb[0])).buffer;
  }

  return new Uint8Array(data.subarray(rangesNb[0], rangesNb[1] + 1)).buffer;
}

const mp4AudioSegments = ["deu", "eng", "fra", "ita", "spa"].map((lang) => {
  const data = require(`arraybuffer-loader!./media/a-${lang}-0128k-aac.mp4`);
  return {
    url: baseURL + "a-" + lang + "-0128k-aac.mp4",
    data: (headers) => getByteRangedData(headers.Range, data),
    contentType: "audio/mp4",
  };
});

const webmAudioSegments = ["deu", "eng", "fra", "ita", "spa"].map((lang) => {
  const data = require(`arraybuffer-loader!./media/a-${lang}-0128k-libopus.webm`);
  return {
    url: baseURL + "a-" + lang + "-0128k-libopus.webm",
    data: (headers) => getByteRangedData(headers.range, data),
    contentType: "audio/webm",
  };
});

const mp4VideoSegments = [
  "0144p-0100k", "0240p-0400k", "0360p-0750k", "0480p-1000k", "0576p-1400k",
].map(quality => {
  const data = require(`arraybuffer-loader!./media/v-${quality}-libx264.mp4`);
  return {
    url: baseURL + "v-" + quality + "-libx264.mp4",
    data: (headers) => getByteRangedData(headers.range, data),
    contentType: "video/mp4",
  };
});

const webmVideoSegments = [
  "0144p-0100k", "0240p-0300k", "0360p-0550k", "0480p-0750k", "0576p-1000k",
].map(quality => {
  const data = require(`arraybuffer-loader!./media/v-${quality}-vp9.webm`);
  return {
    url: baseURL + "v-" + quality + "-vp9.webm",
    data: (headers) => getByteRangedData(headers.range, data),
    contentType: "video/mp4",
  };
});

const textSegments = ["el", "en", "fr"].map(lang => {
  const data = require(`arraybuffer-loader!./media/s-${lang}.webvtt`);
  return {
    url: baseURL + "s-" + lang + ".webvtt",
    data,
    contentType: "text/plain",
  };
});

export default [
  // Manifest
  {
    url: baseURL + "dash.mpd",
    data: require("raw-loader!./media/dash.mpd").default,
    contentType: "application/dash+xml",
  },
  ...mp4AudioSegments,
  ...webmAudioSegments,
  ...mp4VideoSegments,
  ...webmVideoSegments,
  ...textSegments,
];
