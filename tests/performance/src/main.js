import RxPlayer from "rx-player";
import { manifestInfos } from "../../contents/DASH_static_SegmentTimeline";
import sleep from "../../utils/sleep";
import waitForPlayerState, {
  waitForLoadedStateAfterLoadVideo,
} from "../../utils/waitForPlayerState";

let player;

test();

async function test() {
  await sleep(200);
  const timeBeforeLoad = performance.now();
  player = new RxPlayer({ initialVideoBitrate: Infinity,
                          initialAudioBitrate: Infinity,
                          videoElement: document.getElementsByTagName("video")[0] });
  player.loadVideo({ url: manifestInfos.url,
                     transport: manifestInfos.transport });
  await waitForLoadedStateAfterLoadVideo(player);
  const timeToLoad = performance.now() - timeBeforeLoad;
  sendTestResult("loading", timeToLoad);
  await sleep(1);
  const timeBeforeSeek = performance.now();
  player.seekTo(20);
  await waitForPlayerState(player, "PAUSED", ["SEEKING", "BUFFERING"]);
  const timeToSeek = performance.now() - timeBeforeSeek;
  sendTestResult("seeking", timeToSeek);
  reloadIfNeeded();
}

function sendTestResult(testName, testResult) {
  fetch("http://127.0.0.1:6789", {
    headers: { "Content-Type": "application/json" },
    method: "POST",
    body: JSON.stringify({ type: "value",
                           data: { name: testName, value: testResult } }),
  });
}

function sendLog(log) {
  fetch("http://127.0.0.1:6789", {
    headers: { "Content-Type": "application/json" },
    method: "POST",
    body: JSON.stringify({ type: "log", data: log }),
  });
}

function reloadIfNeeded() {
  const testNumber = getTestNumber();
  if (testNumber < 100) {
    location.hash = "#" + (testNumber + 1);
    location.reload();
  } else {
    sendDone();
  }

}

function sendDone() {
  fetch("http://127.0.0.1:6789", {
    headers: { "Content-Type": "application/json" },
    method: "POST",
    body: JSON.stringify({ type: "done" }),
  });
}

function getTestNumber() {
  if (location.hash === "") {
    return 1;
  }
  return Number(location.hash.substring(1));
}

// Allow to display logs in the RxPlayer source code
window.sendLog = sendLog;
