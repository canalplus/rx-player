import RxPlayer from "rx-player";
// TODO: Remove `/experimental/` next release
import { MULTI_THREAD } from "rx-player/experimental/features";
import { EMBEDDED_WORKER } from "rx-player/experimental/features/embeds";
import { multiAdaptationSetsInfos } from "../../contents/static/DASH_static_SegmentTimeline";
import sleep from "../../utils/sleep";
import waitForPlayerState, {
  waitForLoadedStateAfterLoadVideo,
} from "../../utils/waitForPlayerState";
import { declareTestGroup, shouldRunExtendedTests, testEnd, testStart } from "./lib";

declareTestGroup(
  "content loading monothread",
  async () => {
    // --- 1: load ---

    testStart("loading");
    const player = new RxPlayer({
      initialVideoBitrate: Infinity,
      initialAudioBitrate: Infinity,
      videoElement: document.getElementsByTagName("video")[0],
    });
    player.loadVideo({
      url: multiAdaptationSetsInfos.url,
      transport: multiAdaptationSetsInfos.transport,
    });
    await waitForLoadedStateAfterLoadVideo(player);
    testEnd("loading");
    await sleep(10);

    // --- 2: seek ---

    testStart("seeking");
    const seekFinished = waitForPlayerState(player, "PAUSED", ["SEEKING", "BUFFERING"]);
    player.seekTo(20);
    await seekFinished;
    testEnd("seeking");
    await sleep(10);

    // -- 3: change audio track + reload ---

    testStart("audio-track-reload");
    const audioTracks = player.getAvailableAudioTracks();
    if (audioTracks.length < 2) {
      throw new Error("Not enough audio tracks for audio track switching");
    }

    for (const audioTrack of audioTracks) {
      if (!audioTrack.active) {
        player.setAudioTrack({ trackId: audioTrack.id, switchingMode: "reload" });
      }
    }
    await waitForPlayerState(player, "PAUSED");
    testEnd("audio-track-reload");

    player.dispose();
    await sleep(10); // ensure dispose is done
  },
  20000,
);

if (shouldRunExtendedTests()) {
  declareTestGroup(
    "extended loading scenarios",
    async () => {
      const player = new RxPlayer({
        initialVideoBitrate: Infinity,
        initialAudioBitrate: Infinity,
        videoElement: document.getElementsByTagName("video")[0],
      });

      player.loadVideo({
        url: multiAdaptationSetsInfos.url,
        transport: multiAdaptationSetsInfos.transport,
      });
      await waitForLoadedStateAfterLoadVideo(player);

      testStart("loading over active content");
      player.loadVideo({
        url: multiAdaptationSetsInfos.url,
        transport: multiAdaptationSetsInfos.transport,
      });
      await waitForLoadedStateAfterLoadVideo(player);
      testEnd("loading over active content");
      player.dispose();
      await sleep(10);

      const largeManifestPlayer = new RxPlayer({
        videoElement: document.getElementsByTagName("video")[0],
      });
      const manifestParsed = new Promise((resolve) => {
        largeManifestPlayer.addEventListener("newAvailablePeriods", resolve);
      });
      testStart("large multi-period manifest");
      largeManifestPlayer.loadVideo({
        url:
          "http://" +
          __TEST_CONTENT_SERVER__.URL +
          ":" +
          __TEST_CONTENT_SERVER__.PORT +
          "/DASH_static_Large_MultiPeriod/manifest.mpd",
        transport: "dash",
      });
      await manifestParsed;
      testEnd("large multi-period manifest");
      largeManifestPlayer.dispose();
      await sleep(10);
    },
    20000,
  );
}

declareTestGroup(
  "content loading multithread",
  async () => {
    // --- 1: cold loading (Worker attachment etc.) ---

    testStart("cold loading multithread");
    const player = new RxPlayer({
      initialVideoBitrate: Infinity,
      initialAudioBitrate: Infinity,
      videoElement: document.getElementsByTagName("video")[0],
    });
    RxPlayer.addFeatures([MULTI_THREAD]);
    player.attachWorker({
      workerUrl: EMBEDDED_WORKER,
    });
    player.loadVideo({
      url: multiAdaptationSetsInfos.url,
      transport: multiAdaptationSetsInfos.transport,
      mode: "multithread",
    });
    await waitForLoadedStateAfterLoadVideo(player);
    testEnd("cold loading multithread");
    await sleep(10);

    // --- 2: seek ---

    testStart("seeking multithread");
    const seekFinished = waitForPlayerState(player, "PAUSED", ["SEEKING", "BUFFERING"]);
    player.seekTo(20);
    await seekFinished;
    testEnd("seeking multithread");
    await sleep(10);

    // -- 3: change audio track + reload ---

    testStart("audio-track-reload multithread");
    const audioTracks = player.getAvailableAudioTracks();
    if (audioTracks.length < 2) {
      throw new Error("Not enough audio tracks for audio track switching");
    }

    for (const audioTrack of audioTracks) {
      if (!audioTrack.active) {
        player.setAudioTrack({ trackId: audioTrack.id, switchingMode: "reload" });
      }
    }
    await waitForPlayerState(player, "PAUSED");
    testEnd("audio-track-reload multithread");

    player.stop();

    // --- 4: hot loading ---

    await sleep(10);
    testStart("hot loading multithread");
    player.loadVideo({
      url: multiAdaptationSetsInfos.url,
      transport: multiAdaptationSetsInfos.transport,
      mode: "multithread",
    });
    await waitForLoadedStateAfterLoadVideo(player);
    testEnd("hot loading multithread");

    player.dispose();
    await sleep(10); // ensure dispose is done
  },
  20000,
);
