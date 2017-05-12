/**
 * Copyright 2015 CANAL+ Group
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

const { bufferedToRanges } = require("../core/ranges");

let interval;
let closeBtn;

const reUnescapedHtml = /[&<>"']/g;
const htmlEscapes = {
  "&":  "&amp;",
  "<":  "&lt;",
  ">":  "&gt;",
  "\"": "&quot;",
  "'":  "&#39;",
};

function escape(string) {
  return string == null ? "" : String(string).replace(reUnescapedHtml, (match) => htmlEscapes[match]);
}

function bpsToKbps(b) {
  return (b / 1000).toFixed(3);
}

function getDebug(player) {
  const avr = player.getAverageBitrates();

  let avrAudio, avrVideo;
  avr.video.take(1).subscribe((a) => avrVideo = a|0);
  avr.audio.take(1).subscribe((a) => avrAudio = a|0);

  return {
    manifest: player.man,
    version: player.version,
    timeFragment: player.frag,
    currentTime: player.getCurrentTime(),
    state: player.getPlayerState(),
    buffer: bufferedToRanges(player.video.buffered),
    volume: player.getVolume(),
    video: {
      adaptation: player.adas.video,
      representation: player.reps.video,
      maxBitrate: player.getVideoMaxBitrate(),
      bufferSize: player.getVideoBufferSize(),
      avrBitrate: avrVideo,
    },
    audio: {
      adaptation: player.adas.audio,
      representation: player.reps.audio,
      maxBitrate: player.getAudioMaxBitrate(),
      bufferSize: player.getAudioBufferSize(),
      avrBitrate: avrAudio,
    },
  };
}

function update(player, videoElement) {
  const infoElement = videoElement.parentNode.querySelector("#cp--debug-infos-content");
  if (infoElement) {
    let infos;
    try {
      infos = getDebug(player);
    } catch(e) {
      return;
    }

    const { video, audio, manifest } = infos;

    let secureHTML = `<b>Player v${infos.version}</b> (${infos.state})<br>`;

    if (manifest && video && audio) {
      secureHTML += [
        `Container: ${escape(manifest.transportType)}`,
        `Live: ${escape(""+manifest.isLive)}`,
     // `Playing bitrate: ${video.representation.bitrate}/${audio.representation.bitrate}`,
        `Downloading bitrate (Kbit/s):
          ${bpsToKbps(video.representation.bitrate)}/${bpsToKbps(audio.representation.bitrate)}`,
        `Estimated bandwidth (Kbit/s):
          ${bpsToKbps(video.avrBitrate)}/${bpsToKbps(audio.avrBitrate)}`,
        `Location: ${manifest.locations[0]}`,
      ].join("<br>");
    }

    // Representation: ${escape(video.adaptation.id + "/" + video.representation.id)}<br>
    //  ${getCodec(video.representation)}<br>
    // Buffered: ${escape(JSON.stringify(infos.buffer))}<br>
    // <br><b>Audio</b><br>
    // Representation: ${escape(audio.adaptation.id + "/" + audio.representation.id)}<br>
    //  ${getCodec(audio.representation)}<br>`;
    infoElement.innerHTML = secureHTML;
  }
}

function showDebug(player, videoElement) {
  const secureHTML = `<style>
#cp--debug-infos {
  position: absolute;
  top: ${escape(videoElement.offsetTop + 10)}px;
  left: ${escape(videoElement.offsetLeft + 10)}px;
  width: 500px;
  height: 300px;
  background-color: rgba(10, 10, 10, 0.83);
  overflow: hidden;
  color: white;
  text-align: left;
  padding: 2em;
  box-sizing: border-box;
}
#cp--debug-hide-infos {
  float: right;
  cursor: pointer;
}
</style>
<div id="cp--debug-infos">
  <a id="cp--debug-hide-infos">[x]</a>
  <p id="cp--debug-infos-content"></p>
</div>`;

  const videoParent = videoElement.parentNode;

  let container = videoParent.querySelector("#cp--debug-infos-container");
  if (!container) {
    container = document.createElement("div");
    container.setAttribute("id", "cp--debug-infos-container");
    videoParent.appendChild(container);
  }
  container.innerHTML = secureHTML;

  if (!closeBtn) {
    closeBtn = videoParent.querySelector("#cp--debug-hide-infos");
    closeBtn.addEventListener("click", () => hideDebug(videoElement));
  }

  if (interval) {
    clearInterval(interval);
  }
  interval = setInterval(() => update(player, videoElement), 1000);

  update(player, videoElement);
}

function hideDebug(videoElement) {
  const container = videoElement.parentNode.querySelector("#cp--debug-infos-container");
  if (container) {
    container.parentNode.removeChild(container);
  }
  if (interval) {
    clearInterval(interval);
    interval = null;
  }
  if (closeBtn) {
    closeBtn.removeEventListener("click", hideDebug);
    closeBtn = null;
  }
}

function toggleDebug(player, videoElement) {
  const container = videoElement.parentNode.querySelector("#cp--debug-infos-container");
  if (container) {
    hideDebug(videoElement);
  } else {
    showDebug(player, videoElement);
  }
}

module.exports = {
  getDebug,
  showDebug,
  hideDebug,
  toggleDebug,
};
