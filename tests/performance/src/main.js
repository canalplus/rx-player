import RxPlayer from "rx-player";
import { MULTI_THREAD } from "rx-player/experimental/features";
import { EMBEDDED_WORKER } from "rx-player/experimental/features/embeds";
import { multiAdaptationSetsInfos } from "../../contents/DASH_static_SegmentTimeline";
import sleep from "../../utils/sleep";
import waitForPlayerState, {
  waitForLoadedStateAfterLoadVideo,
} from "../../utils/waitForPlayerState";
import { declareTestGroup, testEnd, testStart } from "./lib";

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
    player.seekTo(20);
    await waitForPlayerState(player, "PAUSED", ["SEEKING", "BUFFERING"]);
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
    player.seekTo(20);
    await waitForPlayerState(player, "PAUSED", ["SEEKING", "BUFFERING"]);
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
