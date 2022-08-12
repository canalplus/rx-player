/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable no-console */
import PlaybackObserver from "./core/api/playback_observer";

const videoUrl = "https://www.bok.net/dash/tears_of_steel/cleartext/stream.mpd";
const workerUrl = "http://localhost:8080/src/test/worker.js";
const videoElementRef = document.getElementsByTagName("video")[0];

function serializeTimeRanges(timeranges){
  const length = timeranges.length;
  const tr = [];
  for (let i = 0; i < length; i++) {
    tr.push([timeranges.start(i), timeranges.end(i)]);
  }
  return tr;
}


function loadVideo(mpd, videoElement) {
  console.log(mpd);
  const worker = new Worker(workerUrl);
  worker.onerror = console.error;
  worker.onmessage = (msg) => {
        // msg is always the MediaSourceUrl
    if (msg.data.topic === "objectHandle" && msg.data.arg !== "") {
      console.log(msg.data.arg);
      videoElement.srcObject = msg.data.arg;
      const playbackObserver = new PlaybackObserver(videoElement, {
        lowLatencyMode: false,
        withMediaSource: true,
      });
      playbackObserver.listen((ob) => {
        ob.buffered = serializeTimeRanges(ob.buffered);
        worker.postMessage({ topic: "playback", observation: ob });
      });
    } else {
      console.error(msg);
    }

  };
  worker.postMessage({
    mpd,
    topic: "mpd",
  });

}
loadVideo(videoUrl, videoElementRef);
