import RxPlayer from "rx-player";
import { manifestInfos } from "../../contents/DASH_static_SegmentTimeline";
import sleep from "../../common/utils/sleep";
import waitForPlayerState, {
  waitForLoadedStateAfterLoadVideo,
} from "../../common/utils/waitForPlayerState";

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
  const timeBeforeSeek = performance.now();
  player.seekTo(20);
  await waitForPlayerState(player, "PAUSED", ["SEEKING"]);
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

