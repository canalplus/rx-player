import { afterEach, beforeEach, describe, expect, it } from "vitest";
import RxPlayer from "../../../dist/es2017";
import { MULTI_THREAD } from "../../../dist/es2017/experimental/features/index.js";
import { EMBEDDED_DASH_WASM } from "../../../dist/es2017/__GENERATED_CODE/index.js";
import annexINetworkInfos from "../../contents/static/DASH_static_AnnexI";
import TestWorkerEmbed from "../../embedded_worker_bundle";
import { checkAfterSleepWithBackoff } from "../../utils/checkAfterSleepWithBackoff.js";
import { waitForLoadedStateAfterLoadVideo } from "../../utils/waitForPlayerState";

const VIRTUAL_BASE_URL =
  "http://" +
  __TEST_CONTENT_SERVER__.URL +
  ":" +
  __TEST_CONTENT_SERVER__.PORT +
  "/DASH_static_AnnexI/virtual/";

const EXTENDED_MPD = `<?xml version="1.0" encoding="utf-8"?>
<MPD
  xmlns="urn:mpeg:dash:schema:mpd:2011"
  xmlns:up="urn:mpeg:dash:schema:urlparam:2016"
  type="static"
  mediaPresentationDuration="PT4S"
  minBufferTime="PT1S">
  <EssentialProperty schemeIdUri="urn:mpeg:dash:urlparam:2016">
    <up:ExtUrlQueryInfo
      useMPDUrlQuery="true"
      queryString="root=one"
      queryTemplate="$querypart$" />
  </EssentialProperty>
  <Period id="period" duration="PT4S">
    <SupplementalProperty schemeIdUri="urn:mpeg:dash:urlparam:2016">
      <up:ExtUrlQueryInfo
        queryString="period=two"
        queryTemplate="$querypart$" />
    </SupplementalProperty>
    <AdaptationSet
      id="video"
      contentType="video"
      mimeType="video/mp4"
      codecs="avc1.42C014">
      <EssentialProperty schemeIdUri="urn:mpeg:dash:urlparam:2016">
        <up:ExtUrlQueryInfo
          queryString="adaptation=three"
          queryTemplate="$querypart$" />
      </EssentialProperty>
      <Representation
        id="video-representation"
        bandwidth="400000"
        width="220"
        height="124">
        <SupplementalProperty schemeIdUri="urn:mpeg:dash:urlparam:2016">
          <up:ExtUrlQueryInfo
            queryString="selected=a%26b&amp;discard=x"
            queryTemplate="selected=$query:selected$&amp;cash=$$&amp;unknown=$unsupported$" />
        </SupplementalProperty>
        <SegmentTemplate
          timescale="1"
          duration="4"
          startNumber="1"
          initialization="init.mp4"
          media="segment-$Number$.m4s" />
      </Representation>
    </AdaptationSet>
  </Period>
</MPD>`;

const BASELINE_MPD = `<?xml version="1.0" encoding="utf-8"?>
<MPD
  xmlns="urn:mpeg:dash:schema:mpd:2011"
  xmlns:up="urn:mpeg:dash:schema:urlparam:2014"
  type="static"
  mediaPresentationDuration="PT4S"
  minBufferTime="PT1S">
  <EssentialProperty schemeIdUri="urn:mpeg:dash:urlparam:2014">
    <up:UrlQueryInfo
      useMPDUrlQuery="true"
      queryString="root=one"
      queryTemplate="$querypart$" />
  </EssentialProperty>
  <Period id="period" duration="PT4S">
    <AdaptationSet
      id="video"
      contentType="video"
      mimeType="video/mp4"
      codecs="avc1.42C014">
      <Representation
        id="video-representation"
        bandwidth="400000"
        width="220"
        height="124">
        <SupplementalProperty schemeIdUri="urn:mpeg:dash:urlparam:2014">
          <up:UrlQueryInfo
            queryString="representation=value%2Fencoded"
            queryTemplate="$querypart$" />
        </SupplementalProperty>
        <SegmentTemplate
          timescale="1"
          duration="4"
          startNumber="1"
          media="segment-$Number$.m4s" />
      </Representation>
    </AdaptationSet>
  </Period>
</MPD>`;

runDashAnnexIIntegrationTests();
runDashAnnexIIntegrationTests({ multithread: true });

function runDashAnnexIIntegrationTests({ multithread } = {}) {
  let title = "DASH Annex I segment requests";
  if (multithread === true) {
    RxPlayer.addFeatures([MULTI_THREAD]);
    title += " with worker";
  }

  describe(title, () => {
    let player;
    let textTrackElement;

    beforeEach(() => {
      player = new RxPlayer();
      textTrackElement = null;
      if (multithread === true) {
        player.attachWorker({
          workerUrl: TestWorkerEmbed,
          dashWasmUrl: EMBEDDED_DASH_WASM,
        });
      }
    });

    afterEach(() => {
      player.dispose();
      textTrackElement?.remove();
    });

    it("should expose inherited 2016 parameters on initialization requests", async () => {
      await expectSegmentRequest({
        player,
        multithread,
        mpd: EXTENDED_MPD,
        manifestUrl: VIRTUAL_BASE_URL + "manifest.mpd?mpd=source%26value",
        expectedRequest: {
          url:
            VIRTUAL_BASE_URL +
            "init.mp4?mpd=source%26value&root=one&period=two&adaptation=three" +
            "&selected=a%26b&cash=$&unknown=",
          isInit: true,
          trackType: "video",
        },
      });
    });

    it("should expose inherited 2014 parameters on media requests", async () => {
      await expectSegmentRequest({
        player,
        multithread,
        mpd: BASELINE_MPD,
        manifestUrl: VIRTUAL_BASE_URL + "manifest.mpd?mpd=source%26value",
        expectedRequest: {
          url:
            VIRTUAL_BASE_URL +
            "segment-1.m4s?representation=value%2Fencoded&mpd=source%26value&root=one",
          isInit: false,
          trackType: "video",
        },
      });
    });

    it("should load video, text, and thumbnail resources with Annex I queries", async () => {
      const requestedSegments = [];
      textTrackElement = document.createElement("div");
      document.body.appendChild(textTrackElement);
      if (multithread === true) {
        const workerInterface = player.getWorkerInterface();
        expect(workerInterface).not.toBeNull();
        workerInterface.addMessageListener("segment-loader", (info) => {
          requestedSegments.push(info);
        });
      }

      player.loadVideo({
        url: annexINetworkInfos.url,
        transport: annexINetworkInfos.transport,
        mode: multithread === true ? "multithread" : "main",
        textTrackMode: "html",
        textTrackElement,
        segmentLoader: {
          fn: (info, callbacks) => {
            requestedSegments.push(info);
            callbacks.fallback();
          },
          workerId: "default-segment-loader",
        },
      });
      await waitForLoadedStateAfterLoadVideo(player);

      expect(player.getError()).toBeNull();
      expect(requestedSegments).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            url: annexINetworkInfos.expectedRequests.videoInit,
            isInit: true,
            trackType: "video",
          }),
          expect.objectContaining({
            url: annexINetworkInfos.expectedRequests.videoMedia,
            isInit: false,
            trackType: "video",
          }),
        ]),
      );

      const textTracks = player.getAvailableTextTracks();
      expect(textTracks).toHaveLength(1);
      player.setTextTrack(textTracks[0].id);
      player.seekTo(0.5);
      await checkAfterSleepWithBackoff({ maxTimeMs: 5000, stepMs: 100 }, () => {
        expect(textTrackElement.textContent).toContain("Subtitle in the first segment.");
      });

      const container = document.createElement("div");
      document.body.appendChild(container);
      try {
        await player.renderThumbnail({ container, time: 0.5 });
        expect(container.childElementCount).toBe(1);
      } finally {
        container.remove();
      }
    }, 20000);
  });
}

function expectSegmentRequest({
  player,
  multithread,
  mpd,
  manifestUrl,
  expectedRequest,
}) {
  return new Promise((resolve, reject) => {
    let hasFinished = false;
    const onSegmentRequest = (request) => {
      if (
        hasFinished ||
        request.isInit !== expectedRequest.isInit ||
        request.trackType !== expectedRequest.trackType
      ) {
        return;
      }
      hasFinished = true;
      try {
        expect(request).toMatchObject(expectedRequest);
        player.stop();
        resolve();
      } catch (error) {
        reject(error);
      }
    };

    if (multithread === true) {
      const workerInterface = player.getWorkerInterface();
      expect(workerInterface).not.toBeNull();
      workerInterface.sendMessage("fake-manifest", mpd);
      workerInterface.addMessageListener("segment-loader", onSegmentRequest);
    }

    player.addEventListener("error", (error) => {
      if (!hasFinished) {
        hasFinished = true;
        reject(error);
      }
    });
    player.loadVideo({
      url: manifestUrl,
      transport: "dash",
      mode: multithread === true ? "multithread" : "main",
      manifestLoader: {
        fn: (_info, callbacks) => {
          callbacks.resolve({ data: mpd });
        },
        workerId: "fake-manifest-manifest-loader",
      },
      segmentLoader: {
        fn: onSegmentRequest,
        workerId: "hanging-segment-loader",
      },
    });
  });
}
