import { afterEach, beforeEach, describe, expect, it } from "vitest";
import RxPlayer from "../../../dist/es2017";
import { MULTI_THREAD } from "../../../dist/es2017/experimental/features/index.js";
import { EMBEDDED_DASH_WASM } from "../../../dist/es2017/__GENERATED_CODE/index.js";
import thumbnailInfos from "../../contents/static/DASH_static_SegmentTimeline/thumbnails.js";
import TestWorkerEmbed from "../../embedded_worker_bundle";
import { checkAfterSleepWithBackoff } from "../../utils/checkAfterSleepWithBackoff.js";
import { waitForLoadedStateAfterLoadVideo } from "../../utils/waitForPlayerState";

function createContainer() {
  const elt = document.createElement("div");
  elt.style.width = "320px";
  elt.style.height = "180px";
  document.body.appendChild(elt);
  return elt;
}

function expectRenderedThumbnail(container) {
  expect(container.childElementCount).toBe(1);
  expect(container.firstElementChild).not.toBeNull();
  expect(container.firstElementChild.className).toBe("__rx-thumbnail__");
  expect(container.firstElementChild.tagName).toBe("CANVAS");
  expect(container.firstElementChild.width).toBe(320);
  expect(container.firstElementChild.height).toBe(180);
}

runDashRenderThumbnailTests();
runDashRenderThumbnailTests({ multithread: true });

function runDashRenderThumbnailTests({ multithread } = {}) {
  let title = "DASH renderThumbnail";
  if (multithread === true) {
    RxPlayer.addFeatures([MULTI_THREAD]);
    title = "DASH renderThumbnail with worker";
  }

  describe(title, () => {
    let player;
    let container1;
    let container2;
    let delayedThumbnailRequests;

    beforeEach(() => {
      player = new RxPlayer();
      if (multithread === true) {
        player.attachWorker({
          workerUrl: TestWorkerEmbed,
          dashWasmUrl: EMBEDDED_DASH_WASM,
        });
      }
      container1 = createContainer();
      container2 = createContainer();
      delayedThumbnailRequests = null;
    });

    afterEach(() => {
      delayedThumbnailRequests?.restore();
      player.dispose();
      container1.remove();
      container2.remove();
    });

    it("should fetch and render DASH thumbnails", async () => {
      player.loadVideo({
        url: thumbnailInfos.url,
        transport: "dash",
        mode: multithread === true ? "multithread" : "main",
      });
      await waitForLoadedStateAfterLoadVideo(player);

      expect(player.getAvailableThumbnailTracks({ time: 0.5 })).toEqual([
        {
          id: "thumbnails_320x180",
          width: 320,
          height: 180,
          mimeType: "image/jpeg",
        },
      ]);

      await player.renderThumbnail({
        container: container1,
        time: 0.5,
      });

      expectRenderedThumbnail(container1);
    });

    it("should abort the previous render when requesting another thumbnail on the same container", async () => {
      player.loadVideo({
        url: thumbnailInfos.url,
        transport: "dash",
        mode: multithread === true ? "multithread" : "main",
      });
      await waitForLoadedStateAfterLoadVideo(player);

      const firstPromise = player.renderThumbnail({
        container: container1,
        time: 0.5,
      });
      const secondPromise = player.renderThumbnail({
        container: container1,
        time: 12,
      });

      await expect(firstPromise).rejects.toMatchObject({ code: "ABORTED" });
      await expect(secondPromise).resolves.toBeUndefined();

      await checkAfterSleepWithBackoff({ maxTimeMs: 1000, stepMs: 50 }, () => {
        expectRenderedThumbnail(container1);
      });
    });

    if (multithread !== true) {
      it("should keep the newer thumbnail if the older request resolves after being aborted", async () => {
        player.loadVideo({
          url: thumbnailInfos.url,
          transport: "dash",
          mode: "main",
        });
        await waitForLoadedStateAfterLoadVideo(player);

        delayedThumbnailRequests = delayThumbnailRequests(["tile_1.jpg"]);

        const firstPromise = player.renderThumbnail({
          container: container1,
          time: 0.5,
        });
        await delayedThumbnailRequests.waitForRequest("tile_1.jpg");

        const secondPromise = player.renderThumbnail({
          container: container1,
          time: 12,
        });

        await expect(secondPromise).resolves.toBeUndefined();
        expectRenderedThumbnail(container1);

        delayedThumbnailRequests.release("tile_1.jpg");
        await expect(firstPromise).rejects.toMatchObject({ code: "ABORTED" });

        await checkAfterSleepWithBackoff({ maxTimeMs: 1000, stepMs: 50 }, () => {
          expectRenderedThumbnail(container1);
        });
      });

      it("should still abort the latest pending render after an older aborted request resolves", async () => {
        player.loadVideo({
          url: thumbnailInfos.url,
          transport: "dash",
          mode: "main",
        });
        await waitForLoadedStateAfterLoadVideo(player);

        delayedThumbnailRequests = delayThumbnailRequests(["tile_1.jpg", "tile_2.jpg"]);

        const firstPromise = player.renderThumbnail({
          container: container1,
          time: 0.5,
        });
        await delayedThumbnailRequests.waitForRequest("tile_1.jpg");

        const secondPromise = player.renderThumbnail({
          container: container1,
          time: 12,
        });
        await delayedThumbnailRequests.waitForRequest("tile_2.jpg");

        delayedThumbnailRequests.release("tile_1.jpg");
        await expect(firstPromise).rejects.toMatchObject({ code: "ABORTED" });

        const thirdPromise = player.renderThumbnail({
          container: container1,
          time: 24,
        });

        delayedThumbnailRequests.release("tile_2.jpg");
        await expect(secondPromise).rejects.toMatchObject({ code: "ABORTED" });
        await expect(thirdPromise).resolves.toBeUndefined();

        await checkAfterSleepWithBackoff({ maxTimeMs: 1000, stepMs: 50 }, () => {
          expectRenderedThumbnail(container1);
        });
      });
    }

    it("should keep or clear the previous thumbnail on error depending on keepPreviousThumbnailOnError", async () => {
      player.loadVideo({
        url: thumbnailInfos.url,
        transport: "dash",
        mode: multithread === true ? "multithread" : "main",
      });
      await waitForLoadedStateAfterLoadVideo(player);

      await player.renderThumbnail({
        container: container1,
        time: 0.5,
      });
      expectRenderedThumbnail(container1);

      await expect(
        player.renderThumbnail({
          container: container1,
          time: 200,
          keepPreviousThumbnailOnError: true,
        }),
      ).rejects.toMatchObject({ code: "NO_THUMBNAIL" });
      expectRenderedThumbnail(container1);

      await expect(
        player.renderThumbnail({
          container: container1,
          time: 200,
        }),
      ).rejects.toMatchObject({ code: "NO_THUMBNAIL" });
      expect(container1.childElementCount).toBe(0);
    });

    it("should not cancel a shared thumbnail request when aborting only one container", async () => {
      player.loadVideo({
        url: thumbnailInfos.url,
        transport: "dash",
        mode: multithread === true ? "multithread" : "main",
      });
      await waitForLoadedStateAfterLoadVideo(player);

      const firstPromise = player.renderThumbnail({
        container: container1,
        time: 0.5,
      });
      const secondPromise = player.renderThumbnail({
        container: container2,
        time: 0.5,
      });
      const replacementPromise = player.renderThumbnail({
        container: container1,
        time: 12,
      });

      await expect(firstPromise).rejects.toMatchObject({ code: "ABORTED" });
      await expect(secondPromise).resolves.toBeUndefined();
      await expect(replacementPromise).resolves.toBeUndefined();

      await checkAfterSleepWithBackoff({ maxTimeMs: 1000, stepMs: 50 }, () => {
        expectRenderedThumbnail(container1);
        expectRenderedThumbnail(container2);
      });
    });
  });
}

function delayThumbnailRequests(fileNames) {
  const NativeXHR = XMLHttpRequest;
  const nativeOpen = NativeXHR.prototype.open;
  const nativeSend = NativeXHR.prototype.send;
  const delayedRequests = new Map();
  const requestPromises = new Map();
  const requestResolvers = new Map();
  const waitingFileNames = new Set(fileNames);

  XMLHttpRequest.prototype.open = function open(method, url, async, user, password) {
    this.__thumbnailTestUrl = url;
    return nativeOpen.call(this, method, url, async, user, password);
  };

  XMLHttpRequest.prototype.send = function send(body) {
    const requestUrl =
      typeof this.__thumbnailTestUrl === "string" ? this.__thumbnailTestUrl : "";
    const matchingFileName = [...waitingFileNames].find((fileName) =>
      requestUrl.includes(fileName),
    );
    if (matchingFileName === undefined) {
      return nativeSend.call(this, body);
    }

    if (!requestPromises.has(matchingFileName)) {
      requestPromises.set(
        matchingFileName,
        new Promise((resolve) => {
          requestResolvers.set(matchingFileName, resolve);
        }),
      );
    }
    delayedRequests.set(matchingFileName, {
      xhr: this,
      body,
    });
    requestResolvers.get(matchingFileName)();
  };

  return {
    release(fileName) {
      const delayedRequest = delayedRequests.get(fileName);
      expect(delayedRequest).toBeDefined();
      delayedRequests.delete(fileName);
      waitingFileNames.delete(fileName);
      nativeSend.call(delayedRequest.xhr, delayedRequest.body);
    },
    async waitForRequest(fileName) {
      if (!requestPromises.has(fileName)) {
        requestPromises.set(
          fileName,
          new Promise((resolve) => {
            requestResolvers.set(fileName, resolve);
          }),
        );
      }
      await requestPromises.get(fileName);
    },
    restore() {
      XMLHttpRequest.prototype.open = nativeOpen;
      XMLHttpRequest.prototype.send = nativeSend;
    },
  };
}
